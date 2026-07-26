package in.keshavcreates.urbanbites.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import in.keshavcreates.urbanbites.io.FoodRequest;
import in.keshavcreates.urbanbites.io.FoodResponse;
import in.keshavcreates.urbanbites.service.FoodService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/foods")
public class FoodController {

    @Autowired
    private FoodService foodService;

    @PostMapping("")
    public FoodResponse addFood(@RequestPart("food") String foodString,
                                @RequestPart("file") MultipartFile file) {
        ObjectMapper objectMapper = new ObjectMapper();
        FoodRequest request = null;
        try {
            request = objectMapper.readValue(foodString, FoodRequest.class);
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST , "Invalid JSON format");
        }
        return foodService.addFood(request , file);

    }

    @GetMapping("/getAll")
    public List<FoodResponse> getAll(){
        return foodService.getAll();
    }

    @GetMapping("/getFood/{id}")
    public FoodResponse getFoodById(@PathVariable("id") String id){
        return foodService.getFoodById(id);
    }

    @DeleteMapping("/deleteFood/{id}")
    public void deleteFoodById(@PathVariable("id") String id){
        foodService.deleteFood(id);
    }

    @PutMapping("/{id}")
    public FoodResponse updateFood(@PathVariable("id") String id,
                                   @RequestPart("food") String foodString,
                                   @RequestPart(value = "file", required = false) MultipartFile file) {
        ObjectMapper objectMapper = new ObjectMapper();
        FoodRequest request = null;
        try {
            request = objectMapper.readValue(foodString, FoodRequest.class);
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST , "Invalid JSON format");
        }
        return foodService.updateFood(id, request, file);
    }

    @PutMapping("/{id}/toggle-availability")
    public FoodResponse toggleAvailability(@PathVariable("id") String id) {
        return foodService.toggleAvailability(id);
    }

    @PutMapping("/{id}/toggle-bestseller")
    public FoodResponse toggleBestSeller(@PathVariable("id") String id) {
        return foodService.toggleBestSeller(id);
    }
}
