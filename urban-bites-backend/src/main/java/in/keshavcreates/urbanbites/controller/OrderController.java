package in.keshavcreates.urbanbites.controller;

import in.keshavcreates.urbanbites.io.OrderRequest;
import in.keshavcreates.urbanbites.io.OrderResponse;
import in.keshavcreates.urbanbites.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @PostMapping("/place")
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse placeOrder(@RequestBody OrderRequest orderRequest) {
        return orderService.placeOrder(orderRequest);
    }

    @GetMapping("/myorders")
    public List<OrderResponse> getMyOrders() {
        return orderService.getOrdersForUser();
    }

    @GetMapping("/all")
    public List<OrderResponse> getAllOrders() {
        return orderService.getAllOrders();
    }

    @PostMapping("/verify")
    public OrderResponse verifyPayment(@RequestBody java.util.Map<String, String> request) {
        String orderId = request.get("razorpayOrderId");
        String paymentId = request.get("razorpayPaymentId");
        String signature = request.get("razorpaySignature");
        return orderService.verifyPayment(orderId, paymentId, signature);
    }

    @PutMapping("/{id}/status")
    public OrderResponse updateOrderStatus(@PathVariable("id") String id, @RequestBody java.util.Map<String, String> request) {
        String status = request.get("status");
        return orderService.updateOrderStatus(id, status);
    }

    @PostMapping("/{id}/cancel")
    public OrderResponse cancelOrder(@PathVariable("id") String id) {
        return orderService.cancelOrder(id);
    }
}
