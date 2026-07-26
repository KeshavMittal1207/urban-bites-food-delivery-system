package in.keshavcreates.urbanbites.repository;

import in.keshavcreates.urbanbites.entity.OrderEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<OrderEntity, String> {
    List<OrderEntity> findByUserId(String userId);
    List<OrderEntity> findByUserIdOrderByOrderDateTimeDesc(String userId);
    List<OrderEntity> findAllByOrderByOrderDateTimeDesc();
    Optional<OrderEntity> findByRazorpayOrderId(String razorpayOrderId);
}
