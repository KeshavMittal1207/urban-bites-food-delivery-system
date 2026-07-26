package in.keshavcreates.urbanbites.service;

import in.keshavcreates.urbanbites.entity.FoodEntity;
import in.keshavcreates.urbanbites.io.FoodRequest;
import in.keshavcreates.urbanbites.io.FoodResponse;
import in.keshavcreates.urbanbites.io.UploadedImage;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface FoodService {
    UploadedImage uploadFile(MultipartFile file);

    FoodResponse addFood(FoodRequest request , MultipartFile file);

    List<FoodResponse> getAll();

    FoodResponse getFoodById(String id);

    boolean deleteFile(String publicId);

    void deleteFood(String id);

    FoodResponse updateFood(String id, FoodRequest request, MultipartFile file);

    FoodResponse toggleAvailability(String id);

    FoodResponse toggleBestSeller(String id);
}
