package in.keshavcreates.urbanbites.io;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UploadedImage {
    private String imageUrl;
    private String publicId;
}
