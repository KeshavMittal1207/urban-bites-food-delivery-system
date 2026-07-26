package in.keshavcreates.urbanbites.service;

import in.keshavcreates.urbanbites.entity.CartEntity;
import in.keshavcreates.urbanbites.io.CartRequest;
import in.keshavcreates.urbanbites.io.CartResponse;

public interface CartService {

    CartResponse addToCart(CartRequest cartRequest);
    CartResponse convertToResponse(CartEntity cartEntity);
    CartResponse getCart();
    void clearCart();
    CartResponse removeFromCart(CartRequest cartRequest);
}
