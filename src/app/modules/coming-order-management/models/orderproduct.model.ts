import { ProductModel } from "../../landing/marketplace/models/product.model";
import { OrderModel } from "./order.model";

export class OrderProductModel {
    id: number;
    productId: number;
    product?: ProductModel;
    productValue?: string;
    orderId: number;
    order?: OrderModel;
    proccessDate?: string;
    orderStatus?: number;
    orderStatusStr?: string;
    vendorId: number;
    orderDate?: string;
    priceStr?: string;
    orderNo?: string;
    completionDate?: string;
  }
  