export interface Category {
  id?: string | number;
  name: string;
}

export interface ProductItem {
  id: string | number;
  title?: string;
  name?: string;
  priceUSD?: number;
  price?: string | number;
  category?: Category | string;
  location?: string;
  images?: string[];
  image?: string;
  description?: string;
}