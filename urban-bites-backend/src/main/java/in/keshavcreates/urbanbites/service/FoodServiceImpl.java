package in.keshavcreates.urbanbites.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import in.keshavcreates.urbanbites.entity.FoodEntity;
import in.keshavcreates.urbanbites.exception.ResourceNotFoundException;
import in.keshavcreates.urbanbites.io.FoodRequest;
import in.keshavcreates.urbanbites.io.FoodResponse;
import in.keshavcreates.urbanbites.io.UploadedImage;
import in.keshavcreates.urbanbites.repository.FoodRepository;
import in.keshavcreates.urbanbites.repository.ReviewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class FoodServiceImpl implements FoodService{

    @Autowired
    private FoodRepository foodRepository;

    @Autowired
    private Cloudinary cloudinary;

    @Autowired
    private ReviewRepository reviewRepository;

    public UploadedImage uploadFile(MultipartFile multipartFile) {
        try {
            File file = File.createTempFile(UUID.randomUUID().toString() , multipartFile.getOriginalFilename());
            multipartFile.transferTo(file);

            Map uploadResult = cloudinary.uploader().upload(file , ObjectUtils.emptyMap());
            file.deleteOnExit();
            String publicId = uploadResult.get("public_id").toString();
            String imageUrl = uploadResult.get("secure_url").toString();
            return new UploadedImage(imageUrl , publicId);
        } catch (IOException e) {
            throw new IllegalStateException("Image upload failed", e);
        }
    }
    public FoodResponse addFood(FoodRequest request , MultipartFile file){
        FoodEntity foodEntity  = convertToEntity(request);
        UploadedImage uploadedImage = uploadFile(file);
        foodEntity.setImageUrl(uploadedImage.getImageUrl());
        foodEntity.setImagePublicId(uploadedImage.getPublicId());
        FoodEntity foodEntity1 = foodRepository.save(foodEntity);
        return convertToResponse(foodEntity1);
    }
    @Override
    public List<FoodResponse> getAll() {
        List<FoodEntity> foodEntities= foodRepository.findAll();
        return foodEntities.stream().map(entity -> convertToResponse(entity)).collect(Collectors.toList());
    }

    public FoodResponse getFoodById(String id) {
        FoodEntity entity = foodRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Food not found for id: " + id));
        return convertToResponse(entity);
    }


    public FoodEntity convertToEntity(FoodRequest request){
        return FoodEntity.builder()
                .name(request.getName())
                .description(request.getDescription())
                .category(request.getCategory())
                .price(request.getPrice())
                .available(request.isAvailable())
                .bestSeller(request.isBestSeller())
                .build();
    }
    public FoodResponse convertToResponse(FoodEntity foodEntity){
        Double avgRating = reviewRepository.getAverageRatingForFood(foodEntity.getId());
        double rating = avgRating != null ? Math.round(avgRating * 10.0) / 10.0 : 0.0;
        return FoodResponse.builder()
                .id(foodEntity.getId())
                .name(foodEntity.getName())
                .price(foodEntity.getPrice())
                .imageUrl((foodEntity.getImageUrl()))
                .category(foodEntity.getCategory())
                .description(foodEntity.getDescription())
                .available(foodEntity.isAvailable())
                .bestSeller(foodEntity.isBestSeller())
                .rating(rating)
                .build();
    }
    public boolean deleteFile(String publicId){
        try {
            Map result = cloudinary.uploader().destroy(publicId,ObjectUtils.emptyMap());
            return "ok".equals(result.get("result"));
        } catch (IOException e) {
            e.printStackTrace();
            return false;
        }
    }
    public void deleteFood(String id) {
        FoodEntity foodEntity = foodRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Food not found for id: " + id));
        boolean isFileDelete = deleteFile(foodEntity.getImagePublicId());
        if (isFileDelete) {
            foodRepository.deleteById(id);
        } else {
            throw new IllegalStateException("Unable to delete food image from Cloudinary");
        }
    }

    @Override
    public FoodResponse updateFood(String id, FoodRequest request, MultipartFile file) {
        FoodEntity food = foodRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Food not found for id: " + id));
        food.setName(request.getName());
        food.setDescription(request.getDescription());
        food.setPrice(request.getPrice());
        food.setCategory(request.getCategory());
        food.setAvailable(request.isAvailable());
        food.setBestSeller(request.isBestSeller());
        
        if (file != null && !file.isEmpty()) {
            if (food.getImagePublicId() != null) {
                deleteFile(food.getImagePublicId());
            }
            UploadedImage uploadedImage = uploadFile(file);
            food.setImageUrl(uploadedImage.getImageUrl());
            food.setImagePublicId(uploadedImage.getPublicId());
        }
        
        FoodEntity updated = foodRepository.save(food);
        return convertToResponse(updated);
    }

    @Override
    public FoodResponse toggleAvailability(String id) {
        FoodEntity food = foodRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Food not found for id: " + id));
        food.setAvailable(!food.isAvailable());
        FoodEntity updated = foodRepository.save(food);
        return convertToResponse(updated);
    }

    @Override
    public FoodResponse toggleBestSeller(String id) {
        FoodEntity food = foodRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Food not found for id: " + id));
        food.setBestSeller(!food.isBestSeller());
        FoodEntity updated = foodRepository.save(food);
        return convertToResponse(updated);
    }
}
