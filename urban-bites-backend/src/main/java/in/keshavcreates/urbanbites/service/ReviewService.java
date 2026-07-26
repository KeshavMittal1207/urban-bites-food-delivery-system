package in.keshavcreates.urbanbites.service;

import in.keshavcreates.urbanbites.io.ReviewRequest;
import in.keshavcreates.urbanbites.io.ReviewResponse;

import java.util.List;

public interface ReviewService {
    ReviewResponse addReview(ReviewRequest request);
    List<ReviewResponse> getReviewsForFood(String foodId);
    Double getAverageRating(String foodId);
}
