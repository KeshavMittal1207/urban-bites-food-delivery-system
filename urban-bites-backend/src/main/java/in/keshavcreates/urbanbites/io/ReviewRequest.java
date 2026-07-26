package in.keshavcreates.urbanbites.io;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ReviewRequest {
    private String foodId;
    private int rating;
    private String comment;
}
