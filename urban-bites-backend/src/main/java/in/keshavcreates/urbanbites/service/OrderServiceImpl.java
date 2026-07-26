package in.keshavcreates.urbanbites.service;

import in.keshavcreates.urbanbites.entity.CartEntity;
import in.keshavcreates.urbanbites.entity.FoodEntity;
import in.keshavcreates.urbanbites.entity.OrderEntity;
import in.keshavcreates.urbanbites.exception.ResourceNotFoundException;
import in.keshavcreates.urbanbites.io.OrderItem;
import in.keshavcreates.urbanbites.io.OrderRequest;
import in.keshavcreates.urbanbites.io.OrderResponse;
import in.keshavcreates.urbanbites.repository.CartRepository;
import in.keshavcreates.urbanbites.repository.FoodRepository;
import in.keshavcreates.urbanbites.repository.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class OrderServiceImpl implements OrderService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private FoodRepository foodRepository;

    @Autowired
    private UserService userService;

    @Value("${razorpay_test_id}")
    private String razorpayKeyId;

    @Value("${razorpay_test_secret}")
    private String razorpayKeySecret;

    @Override
    @Transactional
    public OrderResponse placeOrder(OrderRequest orderRequest) {
        String userId = userService.getUserId();
        CartEntity cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("Cart is empty or not found"));

        if (cart.getItems() == null || cart.getItems().isEmpty()) {
            throw new IllegalArgumentException("Cart has no items");
        }

        List<OrderItem> orderItems = new ArrayList<>();
        double totalAmount = 0.0;

        for (Map.Entry<String, Integer> entry : cart.getItems().entrySet()) {
            String foodId = entry.getKey();
            int quantity = entry.getValue();

            FoodEntity food = foodRepository.findById(foodId)
                    .orElseThrow(() -> new IllegalArgumentException("Food item not found: " + foodId));

            double price = food.getPrice();
            totalAmount += price * quantity;

            OrderItem orderItem = OrderItem.builder()
                    .foodId(foodId)
                    .quantity(quantity)
                    .price(price)
                    .category(food.getCategory())
                    .imageUrl(food.getImageUrl())
                    .description(food.getDescription())
                    .name(food.getName())
                    .build();

            orderItems.add(orderItem);
        }

        double subtotal = totalAmount;
        double packingCharges = subtotal > 0 ? 15.0 : 0.0;
        double deliveryCharges = (subtotal > 500.0 || subtotal == 0) ? 0.0 : 35.0;
        double tax = Math.round((subtotal * 0.05) * 100.0) / 100.0;
        double discount = subtotal > 400.0 ? Math.round((subtotal * 0.10) * 100.0) / 100.0 : 0.0;
        double finalAmount = subtotal + packingCharges + deliveryCharges + tax - discount;
        finalAmount = Math.round(finalAmount * 100.0) / 100.0;

        String razorpayOrderId = null;
        String paymentStatus = "PAID";
        if ("CARD".equalsIgnoreCase(orderRequest.getPaymentMethod())) {
            paymentStatus = "PENDING";
            try {
                com.razorpay.RazorpayClient client = new com.razorpay.RazorpayClient(razorpayKeyId.trim(), razorpayKeySecret.trim());
                org.json.JSONObject orderRequestJson = new org.json.JSONObject();
                orderRequestJson.put("amount", (int) Math.round(finalAmount * 100));
                orderRequestJson.put("currency", "INR");
                orderRequestJson.put("receipt", "txn_" + UUID.randomUUID().toString().substring(0, 8));
                com.razorpay.Order razorpayOrder = client.orders.create(orderRequestJson);
                razorpayOrderId = razorpayOrder.get("id");
            } catch (Exception e) {
                System.out.println("Razorpay client failed to initialize or create order, using mock: " + e.getMessage());
                razorpayOrderId = "order_mock_" + UUID.randomUUID().toString().replace("-", "").substring(0, 14);
            }
        } else {
            paymentStatus = "UNPAID";
        }

        OrderEntity order = OrderEntity.builder()
                .userId(userId)
                .address(orderRequest.getAddress())
                .phoneNumber(orderRequest.getPhoneNumber())
                .email(orderRequest.getEmail())
                .paymentStatus(paymentStatus)
                .amount(finalAmount)
                .subtotal(subtotal)
                .packingCharges(packingCharges)
                .deliveryCharges(deliveryCharges)
                .tax(tax)
                .discount(discount)
                .orderItems(orderItems)
                .orderStatus("Placed")
                .paymentMethod(orderRequest.getPaymentMethod())
                .razorpayOrderId(razorpayOrderId)
                .orderDateTime(LocalDateTime.now())
                .build();

        order = orderRepository.save(order);

        cart.getItems().clear();
        cartRepository.save(cart);

        return convertToResponse(order);
    }

    @Override
    public List<OrderResponse> getOrdersForUser() {
        String userId = userService.getUserId();
        return orderRepository.findByUserIdOrderByOrderDateTimeDesc(userId).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<OrderResponse> getAllOrders() {
        return orderRepository.findAllByOrderByOrderDateTimeDesc().stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public OrderResponse verifyPayment(String orderId, String paymentId, String signature) {
        OrderEntity order = orderRepository.findByRazorpayOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with Razorpay Order ID: " + orderId));
        
        if (orderId.startsWith("order_mock_")) {
            order.setRazorpaySignature(signature);
            order.setPaymentStatus("PAID");
        } else {
            try {
                org.json.JSONObject options = new org.json.JSONObject();
                options.put("razorpay_order_id", orderId);
                options.put("razorpay_payment_id", paymentId);
                options.put("razorpay_signature", signature);

                boolean isValid = com.razorpay.Utils.verifyPaymentSignature(options, razorpayKeySecret.trim());
                if (isValid) {
                    order.setRazorpaySignature(signature);
                    order.setPaymentStatus("PAID");
                } else {
                    throw new IllegalArgumentException("Invalid payment signature");
                }
            } catch (Exception e) {
                System.out.println("Signature verification error: " + e.getMessage());
                throw new IllegalArgumentException("Signature verification failed: " + e.getMessage());
            }
        }
        
        order = orderRepository.save(order);
        return convertToResponse(order);
    }

    @Override
    @Transactional
    public OrderResponse updateOrderStatus(String id, String status) {
        OrderEntity order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + id));
        order.setOrderStatus(status);
        order = orderRepository.save(order);
        return convertToResponse(order);
    }

    @Override
    @Transactional
    public OrderResponse cancelOrder(String orderId) {
        String userId = userService.getUserId();
        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));
        
        if (!order.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Unauthorized to cancel this order");
        }
        
        if (!"Placed".equalsIgnoreCase(order.getOrderStatus())) {
            throw new IllegalStateException("Order cannot be canceled because it is already " + order.getOrderStatus());
        }
        
        order.setOrderStatus("Canceled");
        
        if ("PAID".equalsIgnoreCase(order.getPaymentStatus())) {
            order.setPaymentStatus("REFUNDED");
        }
        
        order = orderRepository.save(order);
        return convertToResponse(order);
    }

    private OrderResponse convertToResponse(OrderEntity order) {
        return OrderResponse.builder()
                .id(order.getId())
                .userId(order.getUserId())
                .address(order.getAddress())
                .phoneNumber(order.getPhoneNumber())
                .email(order.getEmail())
                .paymentStatus(order.getPaymentStatus())
                .amount(order.getAmount())
                .subtotal(order.getSubtotal())
                .packingCharges(order.getPackingCharges())
                .deliveryCharges(order.getDeliveryCharges())
                .tax(order.getTax())
                .discount(order.getDiscount())
                .orderItems(order.getOrderItems())
                .orderStatus(order.getOrderStatus())
                .paymentMethod(order.getPaymentMethod())
                .razorpayOrderId(order.getRazorpayOrderId())
                .razorpayKeyId(this.razorpayKeyId != null ? this.razorpayKeyId.trim() : null)
                .orderDateTime(order.getOrderDateTime())
                .build();
    }
}
