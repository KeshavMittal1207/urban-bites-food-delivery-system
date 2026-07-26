package in.keshavcreates.urbanbites.controller;

import in.keshavcreates.urbanbites.io.ReviewRequest;
import in.keshavcreates.urbanbites.io.ReviewResponse;
import in.keshavcreates.urbanbites.service.ReviewService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    @Autowired
    private ReviewService reviewService;

    @PostMapping("")
    public ReviewResponse addReview(@RequestBody ReviewRequest request) {
        return reviewService.addReview(request);
    }

    @GetMapping("/food/{foodId}")
    public List<ReviewResponse> getReviewsForFood(@PathVariable("foodId") String foodId) {
        return reviewService.getReviewsForFood(foodId);
    }

    @GetMapping("/food/{foodId}/average")
    public Double getAverageRating(@PathVariable("foodId") String foodId) {
        return reviewService.getAverageRating(foodId);
    }
}
