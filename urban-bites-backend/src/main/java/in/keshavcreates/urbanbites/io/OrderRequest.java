package in.keshavcreates.urbanbites.io;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class OrderRequest {
    private String address;
    private String phoneNumber;
    private String email;
    private String paymentMethod;
}
