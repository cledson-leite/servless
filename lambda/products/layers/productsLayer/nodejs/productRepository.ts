import {DocumentClient} from "aws-sdk/clients/dynamodb";

export interface Product {
  id: string;
  productName: string;
  code: string;
  price: number;
  model: string;
  productUrl: string;
}

export class ProductRepository {
    constructor(
      private readonly dbClient: DocumentClient,
      private readonly productsTable: string
    ) {}

    async getAllProducts(): Promise<Product[]> {
      const result = await this.dbClient
        .scan({
          TableName: this.productsTable,
        }).promise();

      return result.Items as Product[];
    }

    async getProductById(productId: string): Promise<Product> {
      const result = await this.dbClient
        .get({
          TableName: this.productsTable,
          Key: {
            id: productId,
          },
        }).promise();

      if(!result.Item) throw new Error(`Product with id ${productId} not found`);
      return result.Item as Product;
    }

    async getProductsByIds(productsIds: string[]): Promise<Product[]> {
      const keys = productsIds.map(id => ({ id }));
      const result = await this.dbClient.batchGet({
        RequestItems: {
          [this.productsTable]: {
            Keys: keys,
          },
        },
      }).promise();
      return result.Responses ? result.Responses[this.productsTable] as Product[] : [];
    }

    async createProduct(product: Product): Promise<Product> {
      product.id = crypto.randomUUID();
      await this.dbClient
        .put({
          TableName: this.productsTable,
          Item: product,
        }).promise();
      return product;
    }

    async deleteProduct(productId: string): Promise<Product> {
      const result = await this.dbClient
        .delete({
          TableName: this.productsTable,
          Key: {
            id: productId,
          },
          ReturnValues: "ALL_OLD",
        }).promise();

      if(!result.Attributes) throw new Error(`Product with id ${productId} not found`);
      return result.Attributes as Product;
    }

    async updateProduct(productId: string, product: Partial<Product>): Promise<Product> {
      const result = await this.dbClient
        .update({
          TableName: this.productsTable,
          Key: {
            id: productId,
          },
          ConditionExpression: "attribute_exists(id)",
          ReturnValues: "UPDATED_NEW",
          UpdateExpression: 'set productName = :productName, code = :code, price = :price, model = :model, productUrl = :productUrl',
          ExpressionAttributeValues: {
            ':productName': product.productName,
            ':code': product.code,
            ':price': product.price,
            ':model': product.model,
            ':productUrl': product.productUrl,
          },
        }).promise();

      if(!result.Attributes) throw new Error(`Product with id ${productId} not found`);
      result.Attributes.id = productId;
      return result.Attributes as Product;
    }
}
