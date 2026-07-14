


import { Platform, IntegrationConfig, SyncResult, Order } from '@/types/order';
import { orderApi } from '../../../services/orderApi';
import { API_BASE_URL } from '../../../services/config';
import { getuserid,storetmpdata} from '../../../services/getbasicdata';

// Platform-specific API connectors
class AmazonConnector {
  constructor(private config: IntegrationConfig) {}

  async fetchOrders(dateFrom: Date, dateTo: Date): Promise<any[]> {
    console.log(`Fetching Amazon orders from ${dateFrom} to ${dateTo}`);
    
    if (!this.config.credentials.sellerId || !this.config.credentials.accessToken) {
      throw new Error('Amazon credentials are not configured properly');
    }
    
    return [];
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing Amazon connection...');
      
      if (!this.config.credentials.sellerId || !this.config.credentials.accessToken) {
        console.error('Missing Amazon credentials');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Amazon connection test failed:', error);
      return false;
    }
  }
}

const mapStatus = (shopifyStatus) => {
  switch (shopifyStatus) {
    case "FULFILLED":
      return "Delivered";
    case "PARTIALLY_FULFILLED":
      return "Shipped";
    case "UNFULFILLED":
      return "Pending";
    default:
      return "Pending";
  }
};

const mapShopifyOrder = (shopifyData) => {
  const orders = shopifyData?.orders?.edges || [];

  return orders.map((edge) => {
    const node = edge.node;

    // 🧾 Order mapping
    const order = {
      orderNumber: node.name?.replace("#", ""),
      customerName: node.customer?.firstName || "Guest",
      customerEmail: node.customer?.email || null,
      customerPhone: node.customer?.phone || null,
      amount: node.totalPriceSet?.shopMoney?.amount || "0",
      orderDate: node.createdAt?.split("T")[0],
      platform: "Shopify",
      status: mapStatus(node.displayFulfillmentStatus),

      // Address
      pincode: node.shippingAddress?.zip || null,
      city: node.shippingAddress?.city || null,
      state: node.shippingAddress?.province || null,
      addressLine1: node.shippingAddress?.address1 || null,
      addressLine2: node.shippingAddress?.address2 || null,

      totalItems: node.lineItems?.edges?.length || 0
    };

    // 📦 Items mapping
    const items = node.lineItems?.edges?.map((itemEdge) => {
      const item = itemEdge.node;

      const price = parseFloat(
        item.discountedUnitPriceSet?.shopMoney?.amount || 0
      );

      const quantity = item.quantity || 1;

      return {
        name: item.title,
        unitPrice: price,
        quantity: quantity,
        totalPrice: price * quantity,
        gstRate: 18 // default
      };
    }) || [];

    return { order, items };
  });
};




function convertShopifyOrderToModel(shopifyOrder, dbOrderId = null, sellerId = null) {
  // Generate UUID if not provided
  const orderId = dbOrderId || '';
  
  // Extract customer information
  const customerName = shopifyOrder.shipping_address 
    ? `${shopifyOrder.shipping_address.first_name || ''} ${shopifyOrder.shipping_address.last_name || ''}`.trim()
    : (shopifyOrder.customer ? `${shopifyOrder.customer.first_name || ''} ${shopifyOrder.customer.last_name || ''}`.trim() : '');

  const customerPhone = shopifyOrder.shipping_address?.phone || 
                        shopifyOrder.billing_address?.phone || 
                        shopifyOrder.customer?.phone || 
                        null;
  
  const customerEmail = shopifyOrder.email || 
                        shopifyOrder.contact_email || 
                        shopifyOrder.customer?.email || 
                        null;
  
  // Extract address fields
  const shippingAddress = shopifyOrder.shipping_address || {};
  const billingAddress = shopifyOrder.billing_address || {};
  
  // Calculate total items
  const totalItems = shopifyOrder.line_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  
  // Convert order date
  const orderDate = shopifyOrder.created_at ? shopifyOrder.created_at.split('T')[0] : null;
  const processedAt = shopifyOrder.processed_at ? new Date(shopifyOrder.processed_at) : null;
  const cancelledAt = shopifyOrder.cancelled_at ? new Date(shopifyOrder.cancelled_at) : null;
  
  // Prepare the Order object
  const convertedOrder = {
    user_id: getuserid(),
    orderNumber: shopifyOrder.order_number?.toString() || shopifyOrder.name?.replace('#', '') || null,
    customerName: customerName,
    customerPhone: customerPhone,
    customerEmail: customerEmail,
    seller: sellerId || 'My Store',
    courier: '-',
    status: mapShopifyFulfillmentStatus(shopifyOrder.fulfillment_status, shopifyOrder.cancelled_at),
    amount: shopifyOrder.total_price?.toString() || '0',
    orderDate: processedAt.toISOString().split('T')[0] || orderDate,
    awb: '-',
    platform: 'Shopify',
    
    // Address fields (flat structure)
    pincode: shippingAddress.zip || billingAddress.zip || null,
    city: shippingAddress.city || billingAddress.city || null,
    state: shippingAddress.province || billingAddress.province || null,
    addressLine1: shippingAddress.address1 || billingAddress.address1 || null,
    addressLine2: shippingAddress.address2 || billingAddress.address2 || null,
    landmark: null,
    
    // Calculated fields
    totalItems: totalItems,
    totalWeight: shopifyOrder.total_weight || 0,
    totalVolumetricWeight: null,
    
    // Shopify-specific fields
    shopifyOrderId: shopifyOrder.id,
    financialStatus: (shopifyOrder.financial_status=="voided" ||  shopifyOrder.financial_status=="pending"?"pending":"paid"),
    fulfillmentStatus: shopifyOrder.fulfillment_status || null,
    paymentGateway: shopifyOrder.financial_status=="pending"?"COD":"Prepaid",
    
    // Financial fields
    subtotalPrice: parseFloat(shopifyOrder.subtotal_price) || 0,
    totalTax: parseFloat(shopifyOrder.total_tax) || 0,
    totalDiscounts: parseFloat(shopifyOrder.total_discounts) || 0,
    totalShippingPrice: parseFloat(shopifyOrder.total_shipping_price_set?.shop_money?.amount) || 0,
    totalOutstanding: parseFloat(shopifyOrder.total_outstanding) || 0,
    currency: shopifyOrder.currency || 'INR',
    taxesIncluded: shopifyOrder.taxes_included || false,
    taxExempt: shopifyOrder.tax_exempt || false,
    
    // Tracking & source fields
    confirmationNumber: shopifyOrder.confirmation_number || null,
    checkoutId: shopifyOrder.checkout_id || null,
    checkoutToken: shopifyOrder.checkout_token || null,
    orderStatusUrl: shopifyOrder.order_status_url || null,
    sourceName: shopifyOrder.source_name || null,
    
    // Customer context
    browserIp: shopifyOrder.browser_ip || null,
    userAgent: shopifyOrder.client_details?.user_agent || null,
    
    // Addresses as JSON
    shippingAddress: shippingAddress,
    billingAddress: billingAddress,
    customerData: shopifyOrder.customer || null,
    
    // Timestamps
    processedAt: processedAt,
    cancelledAt: cancelledAt,
    cancelReason: shopifyOrder.cancel_reason || null,
    trackingnumber: null
  };
  
  // Remove undefined values
  Object.keys(convertedOrder).forEach(key => {
    if (convertedOrder[key] === undefined) {
      delete convertedOrder[key];
    }
  });
  
  // Convert line items
  const convertedOrderItems = shopifyOrder.line_items?.map(item => {
    // Calculate GST amount per item
    const gstTaxLine = item.tax_lines?.find(tax => tax.title === 'IGST' || tax.title.includes('GST'));
    // const gstRate = gstTaxLine ? (gstTaxLine.rate * 100) : 18;
    const gstRate = 0;

    
    // Calculate unit price (excluding GST if needed)
    const unitPrice = parseFloat(item.price) || 0;
    const quantity = item.quantity || 1;
    const totalPrice = parseFloat(item.total_discount) 
      ? (unitPrice * quantity) - parseFloat(item.total_discount)
      : (unitPrice * quantity);
    
    return {
      orderId: orderId,
      name: item.title || item.name,
      unitPrice: unitPrice,
      quantity: quantity,
      gstRate: gstRate,
      totalPrice: totalPrice,
      // Dimensions (if available from product)
      height: 10,
      width: 10,
      length: 10,
      deadWeight: item.grams ? item.grams / 1000 : null, // Convert grams to kg
      volumetricWeight: null
    };
  }) || [];
  
  return {
    order: convertedOrder,
    orderItems: convertedOrderItems
  };
}

function convertWooCommerceOrderToModel(wooOrder, dbOrderId = null, sellerId = null) {
  // Use provided DB order ID or empty string (as in original)
  const orderId = dbOrderId || '';

  // Extract customer information from billing (shipping may be empty)
  const billing = wooOrder.billing || {};
  const shipping = wooOrder.shipping || {};
  
  const customerName = `${billing.first_name || ''} ${billing.last_name || ''}`.trim() || null;
  const customerPhone = billing.phone || null;
  const customerEmail = billing.email || null;

  // Calculate total items from line items
  const totalItems = wooOrder.line_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

  // Order date: use date_created (local) and split to YYYY-MM-DD
  const orderDate = wooOrder.date_created ? wooOrder.date_created.split('T')[0] : null;
  
  // Processed date: prefer date_paid, fallback to date_created (both as GMT)
  const processedAtRaw = wooOrder.date_paid_gmt || wooOrder.date_created_gmt;
  const processedAt = processedAtRaw ? new Date(processedAtRaw) : null;
  
  // Cancelled date: if status is cancelled, use date_modified_gmt
  const cancelledAt = (wooOrder.status === 'cancelled' && wooOrder.date_modified_gmt) 
    ? new Date(wooOrder.date_modified_gmt) 
    : null;

  // Determine seller: use line item's 'vendor' if available (WooCommerce may not have it)
  // Default to 'WooCommerce Store'
  const seller = wooOrder.line_items?.[0]?.vendor || 'WooCommerce Store';

  // Map WooCommerce status to your target status values
  const status = mapWooCommerceStatus(wooOrder.status);

  // Prepare the Order object (flat structure plus JSON fields)
  const convertedOrder = {
    user_id: sellerId || null,
    orderNumber: wooOrder.number?.toString() || wooOrder.id?.toString() || null,
    customerName: customerName,
    customerPhone: customerPhone,
    customerEmail: customerEmail,
    seller: sellerId || seller,
    courier: '-',
    status: status,
    amount: wooOrder.total?.toString() || '0',
    orderDate: processedAt ? processedAt.toISOString().split('T')[0] : orderDate,
    awb: '-',
    platform: 'WooCommerce',

    // Address fields (flat) – fallback from shipping to billing when shipping is empty
    pincode: shipping.postcode || billing.postcode || null,
    city: shipping.city || billing.city || null,
    state: shipping.state || billing.state || null,
    addressLine1: shipping.address_1 || billing.address_1 || null,
    addressLine2: shipping.address_2 || billing.address_2 || null,
    landmark: null,

    // Calculated fields
    totalItems: totalItems,
    totalWeight: 0,                         // WooCommerce order object does not provide total weight; can be computed from products if needed
    totalVolumetricWeight: null,

    // WooCommerce-specific fields
    woocommerceOrderId: wooOrder.id,
    financialStatus: wooOrder.date_paid ? 'paid' : (wooOrder.status === 'pending' ? 'pending' : 'other'),
    fulfillmentStatus: null,                // WooCommerce uses order status; fulfillment status is not directly available
    paymentGateway: wooOrder.payment_method_title || 'manual',

    // Financial fields
    subtotalPrice: parseFloat(wooOrder.line_items?.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0) || 0),
    totalTax: parseFloat(wooOrder.total_tax || 0),
    totalDiscounts: parseFloat(wooOrder.discount_total || 0),
    totalShippingPrice: parseFloat(wooOrder.shipping_total || 0),
    totalOutstanding: 0,                   // Not directly available; could be computed as total - amount paid
    currency: wooOrder.currency || 'INR',
    taxesIncluded: wooOrder.prices_include_tax || false,
    taxExempt: false,

    // Tracking & source fields
    confirmationNumber: wooOrder.transaction_id || wooOrder.order_key || null,
    checkoutId: null,
    checkoutToken: null,
    orderStatusUrl: wooOrder.payment_url || null,
    sourceName: wooOrder.created_via || null,

    // Customer context
    browserIp: wooOrder.customer_ip_address || null,
    userAgent: wooOrder.customer_user_agent || null,

    // Addresses as JSON (preserve original objects)
    shippingAddress: shipping,
    billingAddress: billing,
    customerData: null,                    // WooCommerce does not embed full customer object here

    // Timestamps
    processedAt: processedAt,
    cancelledAt: cancelledAt,
    cancelReason: null,
    trackingnumber: null
  };

  // Remove undefined values (clean up the object)
  Object.keys(convertedOrder).forEach(key => {
    if (convertedOrder[key] === undefined) {
      delete convertedOrder[key];
    }
  });

  // Convert line items to orderItems array
  const convertedOrderItems = wooOrder.line_items?.map(item => {
    // Extract GST rate: WooCommerce may have tax lines at order level, but not per line item in this structure.
    // For simplicity, we look at item's meta or default to 0. You can enhance this if tax data is available.
    let gstRate = 0;
    if (item.tax_lines && item.tax_lines.length > 0) {
      const gstTax = item.tax_lines.find(tax => tax.title === 'IGST' || tax.title.includes('GST'));
      if (gstTax && gstTax.rate) gstRate = gstTax.rate * 100;
    }
    
    const unitPrice = parseFloat(item.price) || 0;
    const quantity = item.quantity || 1;
    // total already includes line item discounts
    const totalPrice = parseFloat(item.total) || (unitPrice * quantity);

    return {
      orderId: orderId,
      name: item.name,
      unitPrice: unitPrice,
      quantity: quantity,
      gstRate: gstRate,
      totalPrice: totalPrice,
      // Dimensions / weight
      height: null,
      width: null,
      length: null,
      deadWeight: null,   // WooCommerce line items don't include weight in this payload; could be fetched separately
      volumetricWeight: null
    };
  }) || [];

  return {
    order: convertedOrder,
    orderItems: convertedOrderItems
  };
}

/**
 * Maps WooCommerce order status to your target status values.
 * Adjust mapping as needed for your system.
 */
function mapWooCommerceStatus(wcStatus) {
  const statusMap = {
    'pending':    'Pending',
    'processing': 'Processing',
    'on-hold':    'On Hold',
    'completed':  'Delivered',
    'cancelled':  'Cancelled',
    'refunded':   'Refunded',
    'failed':     'Failed'
  };
  return statusMap[wcStatus] || wcStatus || 'Unknown';
}

const filterShopifyOrdersByDateRange = (orders: any[] = [], dateFrom: Date, dateTo: Date) => {
  const fromTime = dateFrom.getTime();
  const toTime = dateTo.getTime();

  return orders.filter((order) => {
    const orderDateValue = order.created_at || order.processed_at || order.updated_at;
    if (!orderDateValue) return false;

    const orderTime = new Date(orderDateValue).getTime();
    if (Number.isNaN(orderTime)) return false;

    return orderTime >= fromTime && orderTime <= toTime;
  });
};

/**
 * Maps Shopify fulfillment status to your order status enum
 */
function mapShopifyFulfillmentStatus(fulfillmentStatus, cancelledAt) {
  // if (cancelledAt) return 'Cancelled';
  
  switch (fulfillmentStatus) {
    case 'fulfilled':
      return 'Delivered';
    case 'partial':
      return 'Shipped';
    case 'pending':

      return 'Pending';


      case null:
      
      return 'Pending';
    default:
      return 'Pending';
  }
}

/**
 * Batch converter for multiple Shopify orders
 */
function convertMultipleShopifyOrders(shopifyOrders, ordernumlist = []) {
  const results = [];
  
  for (const shopifyOrder of shopifyOrders) {
   
    const converted = convertShopifyOrderToModel(shopifyOrder, null, getuserid());
    console.log(shopifyOrder.order_number,shopifyOrder,converted,"shopify order in batch converter>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>")

     if(!ordernumlist.includes(converted.order.orderNumber) && converted.order.status=="Pending" ){
               results.push({order:converted.order,items:converted.orderItems})
      
    }
    
  }

  return results;
}





class ShopifyConnector {
  constructor(private config: IntegrationConfig) {}

  async fetchOrders(dateFrom: Date, dateTo: Date): Promise<any[]> {



    
    if (!this.config.credentials.storeUrl || !this.config.credentials.accessToken) {
      throw new Error('Shopify credentials are not configured properly');
    }
    
    // Format store URLhttps://gbnr1t-h1.myshopify.com
    let storeUrl = this.config.credentials.storeUrl.replace("https://", '').replace(".myshopify.com","").replace("/","");
 
    const createdAtMin = dateFrom.toISOString();
    const createdAtMax = dateTo.toISOString();
    
    let allOrders: any[] = [];
    let pageInfo: string | null = null;
    let hasNextPage = true;

    console.log(`Fetching Shopify orders from ${dateFrom} to ${dateTo}`,this.config,storeUrl);
        const ordernumlist=await orderApi.getAllOrderNum() || []
        console.log(ordernumlist)


     const response = await fetch(`${API_BASE_URL}/integrations/syncsopify`, {
          method:"POST",
          headers: {
            'Content-Type': 'application/json'
          },
          body:JSON.stringify({
            SHOP:storeUrl,
            CLIENT_ID:this.config.credentials.clientid,
            CLIENT_SECRET:this.config.credentials.accessToken,
            user_id:getuserid(),
            ordernumlist
          })
        });
        
        if (!response.ok) {
          throw new Error(`Shopify API error: ${response.status}`);
        }
        
        // const data = await response.json();
        // const filteredOrders = filterShopifyOrdersByDateRange(data?.data || [], dateFrom, dateTo);




        console.log(ordernumlist,"kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk")
        // 
        
        try{
        //  await orderApi.create(convertMultipleShopifyOrders(filteredOrders,ordernumlist) || [])

    // console.log(convertMultipleShopifyOrders(data.data),">>>>>>>>>>ksjdkajsdkasdjkasdasmdnamsdnkshopifyyyyshopifyksadjkajsdknasdkjsakjdksadjkasjdkjasdkjsakdjsakdaskdjkasdj")
        }
        catch(e){
          console.log(e,"eeeeeeeeeeeeeeeeeeee")
        }
        //  return filteredOrders
         return []
 

    
    // try {
    //   while (hasNextPage) {
    //     let url = `${storeUrl}/admin/api/2024-01/orders.json?status=any&created_at_min=${createdAtMin}&created_at_max=${createdAtMax}&limit=250`;
        
    //     if (pageInfo) {
    //       url += `&page_info=${pageInfo}`;
    //     }
        
       
    //     const orders = data.orders || [];
    //     allOrders = allOrders.concat(orders);
        
    //     // Check for next page
    //     const linkHeader = response.headers.get('link');
    //     if (linkHeader && linkHeader.includes('rel="next"')) {
    //       const nextMatch = linkHeader.match(/<[^>]*page_info=([^>]*)>; rel="next"/);
    //       pageInfo = nextMatch ? nextMatch[1] : null;
    //       hasNextPage = !!pageInfo;
    //     } else {
    //       hasNextPage = false;
    //     }
    //   }
      
    //   console.log(`Fetched ${allOrders.length} Shopify orders`);
    //   return allOrders;
    // } catch (error: any) {
    //   console.error('Error fetching Shopify orders:', error);
    //   throw new Error(`Failed to fetch Shopify orders: ${error.message}`);
    // }
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing Shopify connection...');
      
      if (!this.config.credentials.storeUrl || !this.config.credentials.accessToken) {
        console.error('Missing Shopify credentials');
        return false;
      }
      
      let storeUrl = this.config.credentials.storeUrl.replace(/\/$/, '');
      if (!storeUrl.startsWith('http://') && !storeUrl.startsWith('https://')) {
        storeUrl = 'https://' + storeUrl;
      }
      
      const response = await fetch(`${storeUrl}/admin/api/2024-01/shop.json`, {
        headers: {
          'X-Shopify-Access-Token': this.config.credentials.accessToken
        }
      });
      
      const isConnected = response.ok;
      if (isConnected) {
        const data = await response.json();
        console.log('Connected to Shopify store:', data.shop.name);
      }
      
      return isConnected;
    } catch (error) {
      console.error('Shopify connection test failed:', error);
      return false;
    }
  }
  
  protected transformOrder(order: any): any {
    const shippingAddress = order.shipping_address || {};
    const customer = order.customer || {};
    
    const totalItems = order.line_items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
    
    const items = order.line_items?.map((item: any) => ({
      name: item.title || item.name || '',
      unitPrice: parseFloat(item.price) || 0,
      quantity: item.quantity || 1,
      gstRate: 18,
      totalPrice: parseFloat(item.price) * (item.quantity || 1),
      height: null,
      width: null,
      length: null,
      deadWeight: null,
      volumetricWeight: null
    })) || [];
    
    let status = 'Pending';
    if (order.fulfillment_status === 'fulfilled') {
      status = 'Shipped';
    } else if (order.cancelled_at) {
      status = 'Cancelled';
    } else if (order.fulfillment_status === 'partial') {
      status = 'Shipped';
    }
    
    return {
      orderNumber: order.name || order.order_number?.toString() || order.id.toString(),
      customerName: shippingAddress.name || customer.first_name + ' ' + customer.last_name || customer.email || 'Unknown',
      customerPhone: shippingAddress.phone || '',
      customerEmail: customer.email || order.email || '',
      seller: 'Shopify Store',
      courier: order.shipping_lines?.[0]?.title || '-',
      status: status,
      amount: `₹${parseFloat(order.total_price).toFixed(2)}`,
      orderDate: order.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      awb: order.tracking_number || '-',
      platform: 'Shopify' as Platform,
      pincode: shippingAddress.zip || '',
      city: shippingAddress.city || '',
      state: shippingAddress.province || '',
      addressLine1: shippingAddress.address1 || '',
      addressLine2: shippingAddress.address2 || '',
      landmark: '',
      totalItems: totalItems,
      items: items
    };
  }
}




class WooCommerceConnector {
  constructor(private config: IntegrationConfig) {}
mapWooStatus(status){
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'processing':
      return 'Pending';
    case 'completed':
      return 'Delivered';
    case 'cancelled':
      return 'Cancelled';
    case 'refunded':
      return 'Cancelled';
    default:
      return 'Pending';
  }
};









  async fetchOrders(dateFrom: Date, dateTo: Date): Promise<any[]> {
      
    if (!this.config.credentials.storeUrl || !this.config.credentials.apiKey || !this.config.credentials.apiSecret) {
      throw new Error('WooCommerce credentials are not configured properly');
    }

    let response = await fetch(`${API_BASE_URL}/integrations/syncwoocomerce`, {
          method:"POST",
          headers: {
            'Content-Type': 'application/json'
          },
          body:JSON.stringify(this.config.credentials)
        });
        
        if (!response.ok) {
          throw new Error(`Shopify API error: ${response.status}`);
        }
        
        const data = await response.json();
        const ordernumlist=await orderApi.getAllOrderNum() || []

    let tmpstore=[]
for(let y of data?.data || []){


    const converted = convertWooCommerceOrderToModel(y,null,getuserid());
    if(!ordernumlist.includes(converted.order.orderNumber)){
            tmpstore.push({order:converted.order,items:converted.orderItems})

    }
    
}
console.log(tmpstore,"wooocommerce orders converted>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>")
await orderApi.create(tmpstore)

    return data?.data   || [];
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing WooCommerce connection...');
      
      if (!this.config.credentials.storeUrl || !this.config.credentials.apiKey || !this.config.credentials.apiSecret) {
        console.error('Missing WooCommerce credentials');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('WooCommerce connection test failed:', error);
      return false;
    }
  }
}

class CustomConnector {
  constructor(private config: IntegrationConfig) {}

  async fetchOrders(dateFrom: Date, dateTo: Date): Promise<any[]> {
    console.log(`Fetching custom API orders from ${dateFrom} to ${dateTo}`);
    
    if (!this.config.credentials.storeUrl) {
      throw new Error('Custom API URL is not configured');
    }
    
    return [];
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing custom API connection...');
      
      if (!this.config.credentials.storeUrl) {
        console.error('Missing custom API URL');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Custom API connection test failed:', error);
      return false;
    }
  }
}

// Platform connector factory
class PlatformConnectorFactory {
  static createConnector(config: IntegrationConfig): PlatformConnector {
    switch (config.type) {
      case 'Amazon':
        return new AmazonConnector(config);
      case 'Shopify':
        return new ShopifyConnector(config);
      case 'WooCommerce':
        return new WooCommerceConnector(config);
      case 'Custom':
        return new CustomConnector(config);
      default:
        throw new Error(`Unsupported platform: ${config.type}`);
    }
  }
}

// Abstract base class for platform connectors
abstract class PlatformConnector {
  constructor(protected config: IntegrationConfig) {}
  
  abstract fetchOrders(dateFrom: Date, dateTo: Date): Promise<any[]>;
  abstract testConnection(): Promise<boolean>;
  
  protected transformOrder(order: any, platform: Platform): any {
    // Transform platform-specific order to our standard format
    return {
      orderNumber: order.id || order.order_number || order.orderId,
      customerName: order.customer?.name || order.shipping_address?.name || '',
      customerPhone: order.customer?.phone || order.shipping_address?.phone || '',
      customerEmail: order.customer?.email || order.email || '',
      seller: this.config.name,
      courier: order.shipping_method || '-',
      status: this.mapStatus(order.status),
      amount: order.total_price || order.total || order.amount || '0',
      orderDate: order.created_at || order.date_created || new Date().toISOString().split('T')[0],
      awb: order.tracking_number || order.awb || '-',
      platform: platform,
      pincode: order.shipping_address?.postal_code || order.shipping_address?.zip || '',
      city: order.shipping_address?.city || '',
      state: order.shipping_address?.state || '',
      addressLine1: order.shipping_address?.address_line1 || order.shipping_address?.line1 || '',
      addressLine2: order.shipping_address?.address_line2 || order.shipping_address?.line2 || '',
      landmark: order.shipping_address?.landmark || '',
      items: this.transformItems(order.items || order.line_items || [])
    };
  }
  
  protected transformItems(items: any[]): any[] {
    return items.map(item => ({
      name: item.name || item.product_name || '',
      unitPrice: parseFloat(item.price || item.unit_price || 0),
      quantity: parseInt(item.quantity || 1),
      gstRate: item.tax_rate || item.gst_rate || 18,
      totalPrice: parseFloat(item.total_price || item.subtotal || 0),
      height: item.height,
      width: item.width,
      length: item.length,
      deadWeight: item.weight,
      volumetricWeight: item.volumetric_weight
    }));
  }
  
  protected mapStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'Pending',
      'processing': 'Pending',
      'confirmed': 'Pending',
      'shipped': 'Shipped',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled',
      'canceled': 'Cancelled',
      'refunded': 'Cancelled',
      'failed': 'Cancelled',
      'rto': 'RTO',
      'return_to_sender': 'RTO',
      'fulfilled': 'Shipped',
      'partial': 'Shipped',
      'unfulfilled': 'Pending'
    };
    
    return statusMap[status?.toLowerCase()] || 'Pending';
  }
}

export class SyncManager {
  private connectors: Map<Platform, PlatformConnector> = new Map();

  constructor(private integrations: IntegrationConfig[]) {
    integrations.forEach(integration => {
      if (integration.isActive) {
        try {
          const connector = PlatformConnectorFactory.createConnector(integration);
          this.connectors.set(integration.type, connector);
        } catch (error) {
          console.error(`Failed to create connector for ${integration.type}:`, error);
        }
      }
    });
  }

  async syncAll(dateFrom: Date, dateTo: Date): Promise<SyncResult[]> {
    const results: SyncResult[] = [];
    
    for (const [platform, connector] of this.connectors) {
      try {
        const result = await this.syncPlatform(platform, connector, dateFrom, dateTo);
        results.push(result);
      } catch (error: any) {
        results.push({
          platform,
          success: false,
          ordersSynced: 0,
          errors: [error.message]
        });
      }
    }
    
    return results;
  }

  async syncByType(platform: Platform, dateFrom: Date, dateTo: Date): Promise<SyncResult> {
    const connector = this.connectors.get(platform);
    
    if (!connector) {
      return {
        platform,
        success: false,
        ordersSynced: 0,
        errors: [`Integration for ${platform} is not active or configured`]
      };
    }

    return await this.syncPlatform(platform, connector, dateFrom, dateTo);
  }

  private async syncPlatform(
    platform: Platform, 
    connector: PlatformConnector, 
    dateFrom: Date, 
    dateTo: Date
  ): Promise<SyncResult> {
    try {
      // Fetch orders from platform
      const platformOrders = await connector.fetchOrders(dateFrom, dateTo);
      
      if (!platformOrders || platformOrders.length === 0) {
        return {
          platform,
          success: true,
          ordersSynced: 0,
          errors: undefined
        };
      }
      
      // Transform and save orders to our system
      let syncedCount = 0;
      const errors: string[] = [];

      for (const platformOrder of platformOrders) {
        try {
          // Transform order based on platform
          let transformedOrder;
          if (platform === 'Shopify' && connector instanceof ShopifyConnector) {
            transformedOrder = (connector as any).transformOrder(platformOrder);
          } else {
            transformedOrder = connector.transformOrder(platformOrder, platform);
          }
          
          // Check if order already exists
          // const existingOrders = await orderApi.getAll({ 
          //   search: transformedOrder.orderNumber 
          // });
          
          // if (existingOrders.length === 0) {
          //   // Create new order
          //   // await orderApi.create(transformedOrder);
          //   syncedCount++;
          // }
        } catch (error: any) {
          errors.push(`Failed to sync order ${platformOrder.id || platformOrder.order_number}: ${error.message}`);
        }
      }

      return {
        platform,
        success: true,
        ordersSynced: syncedCount,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error: any) {
      return {
        platform,
        success: false,
        ordersSynced: 0,
        errors: [error.message]
      };
    }
  }

  async testConnection(platform: Platform, credentials: any): Promise<boolean> {
    try {
      // Create a temporary connector for testing
      const testConfig: IntegrationConfig = {
        id: 'test',
        type: platform,
        name: 'Test',
        isActive: true,
        credentials
      };
      
      const connector = PlatformConnectorFactory.createConnector(testConfig);
      return await connector.testConnection();
    } catch (error: any) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}
