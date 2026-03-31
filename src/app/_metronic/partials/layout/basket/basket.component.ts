import { Component, OnInit } from '@angular/core';
import { BasketService } from './basket.service';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/modules/auth';
import { BasketModel } from 'src/app/modules/basket-management/models/basket.model';

@Component({
  selector: 'app-basket',
  templateUrl: './basket.component.html',
  styleUrls: ['./basket.component.scss']
})
export class BasketComponent implements OnInit {

  total: string = "0";
  basket: BasketModel [] = [];

  constructor(private basketService: BasketService, private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    var currentUser = this.authService.currentUserValue;

    if(currentUser) {
      this.basketService.loadBasketFromDb();
    }
    else{
      this.basketService.loadBasket();
    }

    this.basketService.basket$.subscribe(result => {
      this.basket = result;
      
      if(this.basket) {
        let totalPrice = 0;
        this.basket.forEach(item => {
          totalPrice += item.product?.price!;
        })

        this.total = totalPrice.toFixed(2);
      }
    })
  }

  showBasket() {
    this.router.navigate(['/basketmanagement']);
  }
  
}
