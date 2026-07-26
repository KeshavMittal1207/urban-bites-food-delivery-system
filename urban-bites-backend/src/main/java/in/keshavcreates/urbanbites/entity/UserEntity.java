package in.keshavcreates.urbanbites.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.HashMap;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
public class UserEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    private String name;
    private String email;
    private String password;
    private String resetToken;
    private LocalDateTime resetTokenExpiry;

    @ElementCollection
    @CollectionTable(name = "user_addresses", joinColumns = @JoinColumn(name = "user_id"))
    @MapKeyColumn(name = "address_type")
    @Column(name = "address_text", length = 1000)
    @Builder.Default
    private Map<String, String> savedAddresses = new HashMap<>();
}
