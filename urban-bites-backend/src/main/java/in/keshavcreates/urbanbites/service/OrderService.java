package in.keshavcreates.urbanbites.service;

import in.keshavcreates.urbanbites.io.OrderRequest;
import in.keshavcreates.urbanbites.io.OrderResponse;

import java.util.List;

public interface OrderService {
    OrderResponse placeOrder(OrderRequest orderRequest);
    List<OrderResponse> getOrdersForUser();
    List<OrderResponse> getAllOrders();
    OrderResponse verifyPayment(String orderId, String paymentId, String signature);
    OrderResponse updateOrderStatus(String id, String status);
    OrderResponse cancelOrder(String orderId);
}
