package in.keshavcreates.urbanbites.io;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Builder
@AllArgsConstructor

public class FoodResponse {
    private String id;
    private String name;
    private String description;
    private double price;
    private String imageUrl;
    private String category;
    private boolean available;
    private boolean bestSeller;
    private double rating;
}
