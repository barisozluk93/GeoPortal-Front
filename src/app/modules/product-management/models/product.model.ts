import { CategoryModel } from "./category.model";
import { ProductCommentModel } from "./comment.model";

export class ProductModel {
    id: number;
    name: string;
    downloadLink?: string;
    price: number;
    priceStr?: string;
    userId: number;
    isDeleted: boolean;
    categoryId: number;
  }
  