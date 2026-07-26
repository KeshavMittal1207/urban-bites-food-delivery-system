package in.keshavcreates.urbanbites.io;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class OrderResponse {
    private String id;
    private String userId;
    private String address;
    private String phoneNumber;
    private String email;
    private String paymentStatus;
    private double amount;
    private double subtotal;
    private double packingCharges;
    private double deliveryCharges;
    private double tax;
    private double discount;
    private List<OrderItem> orderItems;
    private String orderStatus;
    private String paymentMethod;
    private String razorpayOrderId;
    private String razorpayKeyId;
    private LocalDateTime orderDateTime;
}
