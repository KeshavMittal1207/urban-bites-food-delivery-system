package in.keshavcreates.urbanbites.controller;

import in.keshavcreates.urbanbites.io.CartRequest;
import in.keshavcreates.urbanbites.io.CartResponse;
import in.keshavcreates.urbanbites.service.CartService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    @Autowired
    private CartService cartService;

    @PostMapping("/addToCart")
    public CartResponse addToCart(@RequestBody CartRequest request){
        String foodId = request.getFoodId();
        if(foodId == null || foodId.isEmpty()){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST , "FoodId not found ");
        }
        return cartService.addToCart(request);
    }

    @GetMapping("/getCart")
    public CartResponse getCart(){
        return cartService.getCart();
    }

    @DeleteMapping("/deleteCart")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearCart(){
        cartService.clearCart();
    }

    @PostMapping("/removeFromCart")
    public CartResponse removeFromCart(@RequestBody CartRequest cartRequest){
        return cartService.removeFromCart(cartRequest);
    }
}
