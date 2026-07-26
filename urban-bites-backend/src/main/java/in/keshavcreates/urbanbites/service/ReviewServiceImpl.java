package in.keshavcreates.urbanbites.service;

import in.keshavcreates.urbanbites.entity.ReviewEntity;
import in.keshavcreates.urbanbites.entity.UserEntity;
import in.keshavcreates.urbanbites.io.ReviewRequest;
import in.keshavcreates.urbanbites.io.ReviewResponse;
import in.keshavcreates.urbanbites.repository.ReviewRepository;
import in.keshavcreates.urbanbites.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ReviewServiceImpl implements ReviewService {

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuthenticationFacade authenticationFacade;

    @Override
    public ReviewResponse addReview(ReviewRequest request) {
        String loggedInUserEmail = authenticationFacade.getAuthentication().getName();
        UserEntity user = userRepository.findByEmail(loggedInUserEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User Not Found"));

        ReviewEntity review = ReviewEntity.builder()
                .foodId(request.getFoodId())
                .userId(user.getId())
                .userName(user.getName())
                .rating(request.getRating())
                .comment(request.getComment())
                .createdAt(LocalDateTime.now())
                .build();

        review = reviewRepository.save(review);
        return convertToResponse(review);
    }

    @Override
    public List<ReviewResponse> getReviewsForFood(String foodId) {
        return reviewRepository.findByFoodId(foodId).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public Double getAverageRating(String foodId) {
        Double avg = reviewRepository.getAverageRatingForFood(foodId);
        return avg != null ? avg : 0.0;
    }

    private ReviewResponse convertToResponse(ReviewEntity review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .foodId(review.getFoodId())
                .userId(review.getUserId())
                .userName(review.getUserName())
                .rating(review.getRating())
                .comment(review.getComment())
                .createdAt(review.getCreatedAt())
                .build();
    }
}
