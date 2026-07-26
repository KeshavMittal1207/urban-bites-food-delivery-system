package in.keshavcreates.urbanbites.entity;

import in.keshavcreates.urbanbites.io.OrderItem;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Builder
public class OrderEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
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

    @ElementCollection
    @CollectionTable(name = "order_items", joinColumns = @JoinColumn(name = "order_id"))
    private List<OrderItem> orderItems;
    private String razorpayOrderId;
    private String razorpaySignature;
    private String orderStatus;
    private String paymentMethod;
    private LocalDateTime orderDateTime;
}
