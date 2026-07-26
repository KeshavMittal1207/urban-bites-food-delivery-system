package in.keshavcreates.urbanbites.repository;

import in.keshavcreates.urbanbites.entity.ReviewEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<ReviewEntity, String> {
    List<ReviewEntity> findByFoodId(String foodId);

    @Query("SELECT AVG(r.rating) FROM ReviewEntity r WHERE r.foodId = :foodId")
    Double getAverageRatingForFood(@Param("foodId") String foodId);
}
