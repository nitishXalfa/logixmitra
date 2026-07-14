import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import OrderWorkspaceToolbar from "@/components/orders/OrderWorkspaceToolbar";
import OrderFilterBar from "@/components/orders/OrderFilterBar";
import OrdersRichTable from "@/components/orders/OrdersRichTable";
import { computeStatusCounts } from "@/utils/orderStatusCounts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { 
  Search, Filter, Download, Eye, Package, Plus, Edit, Trash2, X,
  RefreshCw, Link, Unlink, Clock, CheckCircle, XCircle, 
  Globe, ShoppingBag, Store, Wifi, Ruler, ExternalLink, HelpCircle, Loader2,
  CornerDownLeft,
  User,
  AlignCenter,
  ConeIcon
} from "lucide-react";
import StatCard from "@/components/StatCard";
import { ShoppingCart, CheckCircle as CheckCircleIcon, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Order, OrderStatus, Platform, IntegrationConfig, SyncResult, OrderItem } from "@/types/order";
import { orderApi } from "../../services/orderApi";
import { sellerApi } from "../../services/sellerApi"; 
import { SyncManager } from "@/services/integrations/sync-manager";
import { integrationApi } from "../../services/integrationsApi";
import { getuserid,getuser,storetmpdata,metroPincodeList } from "../../services/getbasicdata";
import {apiRequest} from "../../src/apiglobal/apiconfig"
import { API_BASE_URL, UPLOAD_BASE_URL } from "../../services/config";
import getBrandLogoBase64 from "@/utils/brandAsset";
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import pdfMake from 'pdfmake/build/pdfmake'; 
import pdfFonts from 'pdfmake/build/vfs_fonts';
//  pdfMake.vfs = pdfFonts.pdfMake.vfs;
 // Initialize fonts
 import QRCode from 'qrcode';
pdfMake.vfs = pdfFonts.vfs;

import JsBarcode from 'jsbarcode';
import pincodelist from "../apiglobal/pincodelist.json";
import { readFile, utils } from 'xlsx';
import * as XLSX from "xlsx";
import { set } from "date-fns";


const statusStyles: Record<OrderStatus, string> = {
  Pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
  Shipped: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
  Delivered: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  RTO: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
  Cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
};

const platformIcons: Record<Platform, any> = {
  Manual: Package,
  Amazon: ShoppingBag,
  Shopify: Store,
  WooCommerce: Globe,
  Custom: Wifi,
  Merged: Wifi,

};

const platformColors: Record<Platform, string> = {
  Manual: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
  Amazon: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
  Shopify: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  WooCommerce: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
  Custom: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
};

// const emptyOrderItem: Omit<OrderItem, 'id' | 'volumetricWeight' | 'totalPrice'> = {
//   name: "",
//   unitPrice: 0,
//   quantity: 1,
//   gstRate: 18,
//   height: undefined,
//   width: undefined,
//   length: undefined,
//   deadWeight: undefined,
// };
const emptyOrderItem: Omit<OrderItem, 'id' | 'volumetricWeight' | 'totalPrice'> = {
  name: "",
  sku: "",  // Add this line
  unitPrice: 0,
  quantity: 1,
  gstRate: 18,
  height: undefined,
  width: undefined,
  length: undefined,
  deadWeight: undefined,
};

const emptyOrder = {
  orderNumber: "",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  seller: getuser()?.role=="admin"?"":getuser()?.id,
  courier: "-",
  status: "Pending" as OrderStatus,
  amount: "0",
  orderDate: new Date().toISOString().split('T')[0],
  awb: "-",
  platform: "Manual" as Platform,
  pincode: "",
  city: "",
  state: "",
  addressLine1: "",
  addressLine2: "",
  landmark: "",
  items: [{ ...emptyOrderItem }],
  warehouse: null,
  
  // Missing fields from Order model:
  user_id: null,
  totalItems: 0,
  totalWeight: undefined,
  totalVolumetricWeight: undefined,
  shopifyOrderId: null,
  financialStatus: "pending",
  fulfillmentStatus: null,
  paymentGateway: "COD",
  subtotalPrice: null,
  totalTax: 0,
  totalDiscounts: 0,
  totalShippingPrice: 0,
  totalOutstanding: 0,
  currency: "INR",
  taxesIncluded: false,
  taxExempt: false,
  confirmationNumber: null,
  checkoutId: null,
  checkoutToken: null,
  orderStatusUrl: null,
  sourceName: null,
  browserIp: null,
  userAgent: null,
  shippingAddress: null,
  billingAddress: null,
  customerData: null,
  processedAt: null,
  cancelledAt: null,
  cancelReason: null,
  trackingnumber: null,
};

// Default integrations array
const DEFAULT_INTEGRATIONS: IntegrationConfig[] = [
  {
    id: 'amazon-1',
    type: 'Amazon',
    name: 'Amazon Seller Central',
    isActive: false,
    lastSync: undefined,
    credentials: {}
  },
  {
    id: 'shopify-1',
    type: 'Shopify',
    name: 'Shopify Store',
    isActive: false,
    lastSync: undefined,
    credentials: {}
  },
  {
    id: 'woo-1',
    type: 'WooCommerce',
    name: 'WooCommerce',
    isActive: false,
    lastSync: undefined,
    credentials: {}
  },
  {
    id: 'custom-1',
    type: 'Custom',
    name: 'Custom Website',
    isActive: false,
    lastSync: undefined,
    credentials: {}
  }
];

let warelistbyid={}

// Amazon Integration Setup Guide Component
const AmazonSetupGuide = () => {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-800 dark:text-blue-300">How to get Amazon credentials</h4>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
              Follow these steps to get your Merchant ID and MWS Auth Token from Amazon Seller Central.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="font-medium text-sm">Step-by-step guide:</h4>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-4">
          <li>Log in to your Amazon Seller Central panel</li>
          <li>Navigate to <strong>Permissions</strong> tab and locate <strong>Third-Party Developer and Apps</strong></li>
          <li>Click on <strong>Visit Manage your Apps</strong> button</li>
          <li>Click on <strong>Authorize a new Developer</strong> to generate a new token</li>
          <li>Enter the following developer credentials:
            <ul className="list-disc pl-5 mt-1 space-y-0.5">
              <li>Developer's Name: <code className="bg-muted px-1 py-0.5 rounded">KartRocket</code></li>
              <li>Developer Account Number: <code className="bg-muted px-1 py-0.5 rounded">1469-7463-9584</code></li>
            </ul>
          </li>
          <li>Accept the Amazon MWS License Agreement</li>
          <li>Copy the <strong>Merchant ID</strong> and <strong>MWS Auth Token</strong> from the next screen</li>
        </ol>
        
        <div className="bg-muted/50 rounded-lg p-3 mt-2">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Note:</strong> The Developer Account Number format is 1469-7463-9584. 
            Make sure to enter it exactly as shown above.
          </p>
        </div>
      </div>

      <Button 
        variant="outline" 
        className="w-full gap-2"
        onClick={() => window.open("https://sellercentral.amazon.in/gp/mws/registration/register.html", "_blank")}
      >
        <ExternalLink className="h-4 w-4" />
        Open Amazon Seller Central
      </Button>
    </div>
  );
};

// Shopify Integration Setup Guide Component
const ShopifySetupGuide = () => {
  return (
    <div className="space-y-4">
      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-green-800 dark:text-green-300">How to get Shopify API credentials</h4>
            <p className="text-sm text-green-700 dark:text-green-400 mt-1">
              Follow these steps to create a custom app and get your API credentials from Shopify.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="font-medium text-sm">Step-by-step guide:</h4>
        <ol className="space-y-3 text-sm text-muted-foreground list-decimal pl-4">
          <li>
            <strong>Log in to Shopify Admin Panel</strong>
            <p className="text-xs mt-1">Go to your Shopify admin dashboard.</p>
          </li>
          <li>
            <strong>Go to Apps</strong>
            <p className="text-xs mt-1">Open the Operations menu from the top navigation bar.</p>
          </li>
          <li>
            <strong>Click on "Develop apps for your store"</strong>
            <p className="text-xs mt-1">Scroll down to find this button at the bottom of the Apps page.</p>
          </li>
          <li>
            <strong>Create a new app</strong>
            <p className="text-xs mt-1">Click on "Create an app" and give it a recognizable name like "Shiprocket Integration".</p>
          </li>
          <li>
            <strong>Configure API scopes</strong>
            <p className="text-xs mt-1">Click on "Configure Admin API scopes" and set the following permissions:</p>
            <ul className="list-disc pl-5 mt-1 space-y-0.5 text-xs">
              <li><strong>Read access:</strong> Fulfillment Services & Inventory</li>
              <li><strong>Read & Write access:</strong> Products, Product Listings, Orders, Customers, Draft Orders, Assigned Fulfillment Orders, Merchant Managed Fulfillment Orders, Order Editing, Store Content, Third-Party Fulfillment Orders</li>
            </ul>
          </li>
          <li>
            <strong>Install the app</strong>
            <p className="text-xs mt-1">Click on "Install app" in the top right corner.</p>
          </li>
          <li>
            <strong>Copy API credentials</strong>
            <p className="text-xs mt-1">After installation, go to the API credentials tab to get:</p>
            <ul className="list-disc pl-5 mt-1 space-y-0.5 text-xs">
              <li>Admin API Access Token</li>
              <li>API key</li>
              <li>API secret key</li>
            </ul>
          </li>
        </ol>
        
        <div className="bg-muted/50 rounded-lg p-3 mt-2">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Important Notes:</strong>
          </p>
          <ul className="list-disc pl-5 mt-1 space-y-1 text-xs text-muted-foreground">
            <li>You can only view the access token once after generation. Save it immediately.</li>
            <li>If you lose the token, uninstall and reinstall the app to regenerate.</li>
            <li>Your store URL should be in the format: https://yourstorename.myshopify.com</li>
            <li>For custom domains, use your actual store URL.</li>
            <li>Make sure to grant all required API scopes for full functionality.</li>
          </ul>
        </div>
      </div>

      <Button 
        variant="outline" 
        className="w-full gap-2"
        onClick={() => window.open("https://admin.shopify.com/", "_blank")}
      >
        <ExternalLink className="h-4 w-4" />
        Open Shopify Admin
      </Button>
    </div>
  );
};

let warehouselist_=[]

async function getPincodeDetails(pincode) {
  try {
    const response = await fetch(
      `https://api.postalpincode.in/pincode/${pincode}`
    );

    const data = await response.json();

    if (
      data[0].Status === "Success" &&
      data[0].PostOffice.length > 0
    ) {
      const post = data[0].PostOffice[0];

    return {
          pincode: post.Pincode,
          City: post.Region || post.Name,
          District: post.District,
          State: post.State,
          country: post.Country,
        }
    
    } else {
      return {
        success: false,
        message: "Pincode not found",
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
}

// const FormFields = ({ formData, allsellerlist, setFormData, handleItemChange, addItem, removeItem }: { 
//   formData: typeof emptyOrder;
//   allsellerlist: any[];
//   setFormData: React.Dispatch<React.SetStateAction<typeof emptyOrder>>;
//   handleItemChange: (index: number, field: keyof OrderItem, value: any) => void;
//   addItem: () => void;
//   removeItem: (index: number) => void;
// }) => {
//   const calculateVolumetricWeight = (height?: number, width?: number, length?: number): number | undefined => {
//     if (!height || !width || !length) return undefined;
//     return Number(((height * width * length) / 5000).toFixed(2));
//   };

//   const calculateTotalPrice = (unitPrice: number, quantity: number, gstRate: number): number => {
//     const subtotal = unitPrice * quantity;
//     const gstAmount = (subtotal * gstRate) / 100;
//     return Number((subtotal + gstAmount).toFixed(2));
//   };
//   if(formData?.paymentGateway=="manual"){
//      formData.paymentGateway=formData.financialStatus=="pending"?"COD":"Prepaid"
//   }

//   return (
//     <div className="space-y-6 max-h-[70vh] overflow-y-auto p-1" onClick={(e) => e.stopPropagation()}>
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//         <div className="space-y-2">
//           <Label htmlFor="orderNumber">Order Number *</Label>
//           <Input 
//             id="orderNumber"
//             value={formData.orderNumber} 
//             onChange={e => setFormData(f => ({ ...f, orderNumber: e.target.value }))} 
//             placeholder="ORD-12345"
//             autoComplete="off"
//           />
//         </div>
//         <div className="space-y-2">
//           <Label htmlFor="orderDate">Order Date</Label>
//           <Input 
//             id="orderDate"
//             type="date"
//             value={formData.orderDate} 
//             onChange={e => setFormData(f => ({ ...f, orderDate: e.target.value,processedAt:e.target.value }))} 
//           />
//         </div>
//       </div>

//       <div className="space-y-3">
//         <h3 className="font-medium">Customer Information</h3>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <div className="space-y-2">
//             <Label htmlFor="customerName">Customer Name *</Label>
//             <Input 
//               id="customerName"
//               value={formData.customerName} 
//               onChange={e => setFormData(f => ({ ...f, customerName: e.target.value }))} 
//             />
//           </div>
//           <div className="space-y-2">
//             <Label htmlFor="customerPhone">Phone *</Label>
//            <Input
//   id="customerPhone"
//   value={formData.customerPhone}
//   onChange={(e) => {
//     // allow only numbers and max 10 digits
//     const value = e.target.value.replace(/\D/g, "").slice(0, 10);

//     setFormData((f) => ({
//       ...f,
//       customerPhone: value,
//     }));
//   }}
//   onBlur={(e) => {
//     if (e.target.value.length !== 10) {
//       alert("Phone number must be 10 digits");
//     }
//   }}
// />
//           </div>
//           <div className="space-y-2">
//             <Label htmlFor="customerEmail">Email</Label>
//             <Input 
//               id="customerEmail"
//               type="email"
//               value={formData.customerEmail} 
//               onChange={e => setFormData(f => ({ ...f, customerEmail: e.target.value }))} 
//             />
//           </div>
//         </div>
//       </div>

//       <div className="space-y-3">
//         <h3 className="font-medium">Shipping Address</h3>
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//           <div className="space-y-2">
//             <Label htmlFor="pincode">Pincode *</Label>
//             {/* <Input 
//               id="pincode"
//               defaultValue={formData.pincode} 
//               onBlur={async (e)=>{

//  let checkstat=false
//                  for(let x of pincodelist.Sheet1){
//             if(x.Pincode.includes(e.target.value)){
//               checkstat=true
//               setFormData(f => ({ ...f, pincode: e.target.value, city: x.City, state: x.State }));
//             }

            


//           }

//                    if(!checkstat){

// let response =await getPincodeDetails(e.target.value)
//               setFormData(f => ({ ...f, pincode: e.target.value, city: response.City, state: response.State }));


//             }
                
              
//                 setFormData(f => ({ ...f, pincode: e.target.value }))


//               }
            
            
//             }

//               placeholder="400001"
//             /> */}

//             <Input
//   id="pincode"
//   value={formData.pincode}
//   maxLength={6}
//   onChange={(e) => {
//     // allow only 6 digit numbers
//     const value = e.target.value.replace(/\D/g, "").slice(0, 6);

//     setFormData((f) => ({
//       ...f,
//       pincode: value,
//     }));
//   }}
//   onBlur={async (e) => {
//     const value = e.target.value.trim();

//     // validation
//     if (!/^\d{6}$/.test(value)) {
//       alert("Enter valid 6 digit pincode");
//       return;
//     }

//     let checkstat = false;

//     for (let x of pincodelist.Sheet1) {
//       if (String(x.Pincode) === value) {
//         checkstat = true;

//         setFormData((f) => ({
//           ...f,
//           pincode: value,
//           city: x.City,
//           state: x.State,
//         }));

//         break;
//       }
//     }

//     // API fallback
//     if (!checkstat) {
//       try {
//         let response = await getPincodeDetails(value);

//         setFormData((f) => ({
//           ...f,
//           pincode: value,
//           city: response.City || "",
//           state: response.State || "",
//         }));
//       } catch (error) {
//         alert("Invalid pincode");
//       }
//     }
//   }}
//   placeholder="400001"
// /> 
//           </div>
//           <div className="space-y-2">
//             <Label htmlFor="city">City *</Label>
//             <Input 
//               id="city"
//               value={formData.city} 
//               onChange={e => setFormData(f => ({ ...f, city: e.target.value }))} 
//               placeholder="Mumbai"
//             />
//           </div>
//           <div className="space-y-2">
//             <Label htmlFor="state">State *</Label>
//             <Input 
//               id="state"
//               value={formData.state} 
//               onChange={e => setFormData(f => ({ ...f, state: e.target.value }))} 
//               placeholder="Maharashtra"
//             />
//           </div>
//           <div className="space-y-2 md:col-span-2">
//             <Label htmlFor="addressLine1">Address Line 1 *</Label>
//             <Input 
//               id="addressLine1"
//               value={formData.addressLine1} 
//               onChange={e => setFormData(f => ({ ...f, addressLine1: e.target.value }))} 
//               placeholder="Street address"
//             />
//           </div>
//           <div className="space-y-2">
//             <Label htmlFor="addressLine2">Address Line 2</Label>
//             <Input 
//               id="addressLine2"
//               value={formData.addressLine2} 
//               onChange={e => setFormData(f => ({ ...f, addressLine2: e.target.value }))} 
//               placeholder="Apartment, suite, etc."
//             />
//           </div>
//           <div className="space-y-2">
//             <Label htmlFor="landmark">Landmark</Label>
//             <Input 
//               id="landmark"
//               value={formData.landmark} 
//               onChange={e => setFormData(f => ({ ...f, landmark: e.target.value }))} 
//               placeholder="Near..."
//             />
//           </div>
//         </div>
//       </div>

//       <div className="space-y-3">
//         <div className="flex items-center justify-between">
//           <h3 className="font-medium">Order Items</h3>
//           <Button type="button" variant="outline" size="sm" onClick={addItem}>
//             <Plus className="h-4 w-4 mr-2" /> Add Item
//           </Button>
//         </div>
        
//         {formData.items.map((item, index) => (
//           <Card key={index}>
//             <CardContent className="p-4 space-y-4">
//               <div className="flex items-center justify-between">
//                 <h4 className="text-sm font-medium">Item #{index + 1}</h4>
//                 {formData.items.length > 1 && (
//                   <Button variant="ghost" size="sm" onClick={() => removeItem(index)}>
//                     <Trash2 className="h-4 w-4 text-destructive" />
//                   </Button>
//                 )}
//               </div>
              
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div className="space-y-2 md:col-span-2">
//                   <Label htmlFor={`item-${index}-name`}>Product Name *</Label>
//                   <Input 
//                     id={`item-${index}-name`}
//                     value={item.name} 
//                     onChange={e => handleItemChange(index, 'name', e.target.value)}
//                     placeholder="Product name"
//                   />
//                 </div>
                
//                 <div className="space-y-2">
//                   <Label htmlFor={`item-${index}-price`}>Unit Price (₹) *</Label>
//                   <Input 
//                     id={`item-${index}-price`}
//                     type="number"
//                     value={item.unitPrice} 
//                     onChange={e => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
//                     min="0"
//                     step="0.01"
//                   />
//                 </div>
                
//                 <div className="space-y-2">
//                   <Label htmlFor={`item-${index}-qty`}>Quantity *</Label>
//                   <Input 
//                     id={`item-${index}-qty`}
//                     type="number"
//                     value={item.quantity} 
//                     onChange={e => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
//                     min="1"
//                   />
//                 </div>
                
//                 <div className="space-y-2">
//                   <Label htmlFor={`item-${index}-gst`}>GST Rate (%)</Label>
//                   <Select 
//                     value={String(item.gstRate)} 
//                     onValueChange={v => handleItemChange(index, 'gstRate', parseInt(v))}
//                   >
//                     <SelectTrigger id={`item-${index}-gst`}>
//                       <SelectValue />
//                     </SelectTrigger>
//                     <SelectContent>
//                       {[0, 5, 12, 18, 28].map(rate => (
//                         <SelectItem key={rate} value={String(rate)}>{rate}%</SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 </div>
                
//                 <div className="space-y-2">
//                   <Label htmlFor={`item-${index}-weight`}>Dead Weight (kg)</Label>
//                   <Input 
//                     id={`item-${index}-weight`}
//                     type="number"
//                     value={item.deadWeight || ''} 
//                     onChange={e => handleItemChange(index, 'deadWeight', parseFloat(e.target.value) || undefined)}
//                     min="0"
//                     step="0.1"
//                   />
//                 </div>
//               </div>

//               <div className="space-y-2">
//                 <Label className="flex items-center gap-2">
//                   <Ruler className="h-4 w-4" /> Dimensions (cm)
//                 </Label>
//                 <div className="grid grid-cols-3 gap-2">
//                   <Input 
//                     placeholder="Height"
//                     type="number"
//                     value={item.height || ''} 
//                     onChange={e => handleItemChange(index, 'height', parseFloat(e.target.value) || undefined)}
//                     min="0"
//                     step="0.1"
//                   />
//                   <Input 
//                     placeholder="Width"
//                     type="number"
//                     value={item.width || ''} 
//                     onChange={e => handleItemChange(index, 'width', parseFloat(e.target.value) || undefined)}
//                     min="0"
//                     step="0.1"
//                   />
//                   <Input 
//                     placeholder="Length"
//                     type="number"
//                     value={item.length || ''} 
//                     onChange={e => handleItemChange(index, 'length', parseFloat(e.target.value) || undefined)}
//                     min="0"
//                     step="0.1"
//                   />
//                 </div>
//               </div>

//               <div className="grid grid-cols-2 gap-4 pt-2 border-t">
//                 <div>
//                   <Label className="text-xs text-muted-foreground">Volumetric Weight</Label>
//                   <p className="text-sm font-medium">
//                     {calculateVolumetricWeight(item.height, item.width, item.length) || '-'} kg
//                   </p>
//                 </div>
//                 <div>
//                   <Label className="text-xs text-muted-foreground">Total Price (incl. GST)</Label>
//                   <p className="text-sm font-medium">
//                     ₹{calculateTotalPrice(item.unitPrice, item.quantity, item.gstRate)}
//                   </p>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         ))}
//       </div>
//         <div className="space-y-2">
//           <Label htmlFor="status">Payment Method</Label>
//           <Select value={formData.paymentGateway} onValueChange={v => setFormData(f => ({ ...f, paymentGateway: v }))}>
//             <SelectTrigger id="status">
//               <SelectValue />
//             </SelectTrigger>
//             <SelectContent>
//               {(["Prepaid", "COD"]).map(s => (
//                 <SelectItem key={s} value={s}>{s}</SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>

//      {getuser().role=="admin" &&  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        
//         <div className="space-y-2">
//           <Label htmlFor="seller">Seller *</Label>
//           <Select value={formData.seller} onValueChange={v => setFormData(f => ({ ...f, seller: v }))}>
//             <SelectTrigger id="seller">
//               <SelectValue placeholder="Select seller" />
//             </SelectTrigger>
//             <SelectContent>
//               {allsellerlist.map(s => (
//                 <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>
        
        
//         <div className="space-y-2">
//           <Label htmlFor="courier">Courier</Label>
//           <Select value={formData.courier} onValueChange={v => setFormData(f => ({ ...f, courier: v }))}>
//             <SelectTrigger id="courier">
//               <SelectValue placeholder="Select courier" />
//             </SelectTrigger>
//             <SelectContent>
//               {["eKART","SMC","Amazon","Delhivery","Blue Dart"].map(c => (
//                 <SelectItem key={c} value={c}>{c === "-" ? "Not Assigned" : c}</SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>
// {/*         
//         <div className="space-y-2">
//           <Label htmlFor="status">Status</Label>
//           <Select value={formData.status} onValueChange={v => setFormData(f => ({ ...f, status: v as OrderStatus }))}>
//             <SelectTrigger id="status">
//               <SelectValue />
//             </SelectTrigger>
//             <SelectContent>
//               {(["Pending", "Shipped", "Delivered", "RTO", "Cancelled"] as OrderStatus[]).map(s => (
//                 <SelectItem key={s} value={s}>{s}</SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div> */}




       
        
//          <div className="space-y-2">
//           <Label htmlFor="status">Warehouse</Label>
//           <Select value={formData.warehouse} onValueChange={v => setFormData(f => ({ ...f, warehouse: v }))}>
//             <SelectTrigger id="status">
//               <SelectValue />
//             </SelectTrigger>
//             <SelectContent>
//               {warehouselist_.map(s => (
//                 <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>

//         <div className="space-y-2">
//           <Label htmlFor="awb">AWB Number</Label>
//           <Input 
//             id="awb"
//             value={formData.awb} 
//             onChange={e => setFormData(f => ({ ...f, awb: e.target.value }))} 
//           />
//         </div>
        
//         <div className="space-y-2">
//           <Label htmlFor="platform">Platform</Label>
//           <Select value={formData.platform} onValueChange={v => setFormData(f => ({ ...f, platform: v as Platform }))}>
//             <SelectTrigger id="platform">
//               <SelectValue />
//             </SelectTrigger>
//             <SelectContent>
//               {(["Manual", "Amazon", "Shopify", "WooCommerce", "Custom"] as Platform[]).map(s => (
//                 <SelectItem key={s} value={s}>{s}</SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>
//       </div>}
//     </div>
//   );
// };

const FormFields = ({ formData, allsellerlist, setFormData, handleItemChange, addItem, removeItem, errors = {}, setErrors }: { 
  formData: typeof emptyOrder;
  allsellerlist: any[];
  setFormData: React.Dispatch<React.SetStateAction<typeof emptyOrder>>;
  handleItemChange: (index: number, field: keyof OrderItem, value: any) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
  errors?: any;
  setErrors?: any;
}) => {
  const calculateVolumetricWeight = (height?: number, width?: number, length?: number): number | undefined => {
    if (!height || !width || !length) return undefined;
    return Number(((height * width * length) / 5000).toFixed(2));
  };

  const calculateTotalPrice = (unitPrice: number, quantity: number, gstRate: number): number => {
    const subtotal = unitPrice * quantity;
    const gstAmount = (subtotal * gstRate) / 100;
    return Number((subtotal + gstAmount).toFixed(2));
  };

  const calculateChargeableWeight = (item: OrderItem): number => {
    const volumetric = calculateVolumetricWeight(item.height, item.width, item.length) || 0;
    const deadWeight = item.deadWeight || 0;
    return Math.max(volumetric, deadWeight);
  };

  if (formData?.paymentGateway == "manual") {
    formData.paymentGateway = formData.financialStatus == "pending" ? "COD" : "Prepaid";
  }

  // Helper to get error for a field
  const getError = (field: string, index?: number) => {
    if (!errors) return null;
    if (index !== undefined && errors.items && errors.items[index]) {
      return errors.items[index][field];
    }
    return errors[field];
  };

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto p-1" onClick={(e) => e.stopPropagation()}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="orderNumber" className={getError('orderNumber') ? 'text-red-500' : ''}>
            Order Number <span className="text-red-500">*</span>
          </Label>
          <Input 
            id="orderNumber"
            value={formData.orderNumber} 
            onChange={e => {
              setFormData(f => ({ ...f, orderNumber: e.target.value }));
              if (setErrors && errors?.orderNumber) {
                setErrors((prev: any) => ({ ...prev, orderNumber: null }));
              }
            }} 
            placeholder="ORD-12345"
            autoComplete="off"
            className={getError('orderNumber') ? 'border-red-500 focus:ring-red-500' : ''}
          />
          {getError('orderNumber') && (
            <p className="text-xs text-red-500">{getError('orderNumber')}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="orderDate">Order Date</Label>
          <Input 
            id="orderDate"
            type="date"
            value={formData.orderDate} 
            onChange={e => setFormData(f => ({ ...f, orderDate: e.target.value, processedAt: e.target.value }))} 
          />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-medium">Customer Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="customerName" className={getError('customerName') ? 'text-red-500' : ''}>
              Customer Name <span className="text-red-500">*</span>
            </Label>
            <Input 
              id="customerName"
              value={formData.customerName} 
              onChange={e => {
                setFormData(f => ({ ...f, customerName: e.target.value }));
                if (setErrors && errors?.customerName) {
                  setErrors((prev: any) => ({ ...prev, customerName: null }));
                }
              }}
              className={getError('customerName') ? 'border-red-500 focus:ring-red-500' : ''}
            />
            {getError('customerName') && (
              <p className="text-xs text-red-500">{getError('customerName')}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerPhone" className={getError('customerPhone') ? 'text-red-500' : ''}>
              Phone <span className="text-red-500">*</span>
            </Label>
            <Input
              id="customerPhone"
              value={formData.customerPhone}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                setFormData((f) => ({
                  ...f,
                  customerPhone: value,
                }));
                if (setErrors && errors?.customerPhone) {
                  setErrors((prev: any) => ({ ...prev, customerPhone: null }));
                }
              }}
              onBlur={(e) => {
                if (e.target.value.length !== 10 && e.target.value.length > 0) {
                  if (setErrors) {
                    setErrors((prev: any) => ({ ...prev, customerPhone: "Phone number must be 10 digits" }));
                  }
                }
              }}
              className={getError('customerPhone') ? 'border-red-500 focus:ring-red-500' : ''}
              placeholder="9876543210"
            />
            {getError('customerPhone') && (
              <p className="text-xs text-red-500">{getError('customerPhone')}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerEmail">Email</Label>
            <Input 
              id="customerEmail"
              type="email"
              value={formData.customerEmail} 
              onChange={e => {
                setFormData(f => ({ ...f, customerEmail: e.target.value }));
                if (setErrors && errors?.customerEmail) {
                  setErrors((prev: any) => ({ ...prev, customerEmail: null }));
                }
              }}
              className={getError('customerEmail') ? 'border-red-500 focus:ring-red-500' : ''}
            />
            {getError('customerEmail') && (
              <p className="text-xs text-red-500">{getError('customerEmail')}</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-medium">Shipping Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pincode" className={getError('pincode') ? 'text-red-500' : ''}>
              Pincode <span className="text-red-500">*</span>
            </Label>
            <Input
              id="pincode"
              value={formData.pincode}
              maxLength={6}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                setFormData((f) => ({
                  ...f,
                  pincode: value,
                }));
                if (setErrors && errors?.pincode) {
                  setErrors((prev: any) => ({ ...prev, pincode: null }));
                }
              }}
              onBlur={async (e) => {
                const value = e.target.value.trim();
                if (!/^\d{6}$/.test(value)) {
                  if (setErrors) {
                    setErrors((prev: any) => ({ ...prev, pincode: "Enter valid 6 digit pincode" }));
                  }
                  return;
                }

                let checkstat = false;
                for (let x of pincodelist.Sheet1) {
                  if (String(x.Pincode) === value) {
                    checkstat = true;
                    setFormData((f) => ({
                      ...f,
                      pincode: value,
                      city: x.City,
                      state: x.State,
                    }));
                    if (setErrors && errors?.city) {
                      setErrors((prev: any) => ({ ...prev, city: null, state: null }));
                    }
                    break;
                  }
                }

                if (!checkstat) {
                  try {
                    let response = await getPincodeDetails(value);
                    setFormData((f) => ({
                      ...f,
                      pincode: value,
                      city: response.City || "",
                      state: response.State || "",
                    }));
                  } catch (error) {
                    if (setErrors) {
                      setErrors((prev: any) => ({ ...prev, pincode: "Invalid pincode" }));
                    }
                  }
                }
              }}
              className={getError('pincode') ? 'border-red-500 focus:ring-red-500' : ''}
              placeholder="400001"
            />
            {getError('pincode') && (
              <p className="text-xs text-red-500">{getError('pincode')}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="city" className={getError('city') ? 'text-red-500' : ''}>
              City <span className="text-red-500">*</span>
            </Label>
            <Input 
              id="city"
              value={formData.city} 
              onChange={e => {
                setFormData(f => ({ ...f, city: e.target.value }));
                if (setErrors && errors?.city) {
                  setErrors((prev: any) => ({ ...prev, city: null }));
                }
              }}
              className={getError('city') ? 'border-red-500 focus:ring-red-500' : ''}
              placeholder="Mumbai"
            />
            {getError('city') && (
              <p className="text-xs text-red-500">{getError('city')}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="state" className={getError('state') ? 'text-red-500' : ''}>
              State <span className="text-red-500">*</span>
            </Label>
            <Input 
              id="state"
              value={formData.state} 
              onChange={e => {
                setFormData(f => ({ ...f, state: e.target.value }));
                if (setErrors && errors?.state) {
                  setErrors((prev: any) => ({ ...prev, state: null }));
                }
              }}
              className={getError('state') ? 'border-red-500 focus:ring-red-500' : ''}
              placeholder="Maharashtra"
            />
            {getError('state') && (
              <p className="text-xs text-red-500">{getError('state')}</p>
            )}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="addressLine1" className={getError('addressLine1') ? 'text-red-500' : ''}>
              Address Line 1 <span className="text-red-500">*</span>
            </Label>
            <Input 
              id="addressLine1"
              value={formData.addressLine1} 
              onChange={e => {
                setFormData(f => ({ ...f, addressLine1: e.target.value }));
                if (setErrors && errors?.addressLine1) {
                  setErrors((prev: any) => ({ ...prev, addressLine1: null }));
                }
              }}
              className={getError('addressLine1') ? 'border-red-500 focus:ring-red-500' : ''}
              placeholder="Street address"
            />
            {getError('addressLine1') && (
              <p className="text-xs text-red-500">{getError('addressLine1')}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="addressLine2">Address Line 2</Label>
            <Input 
              id="addressLine2"
              value={formData.addressLine2} 
              onChange={e => setFormData(f => ({ ...f, addressLine2: e.target.value }))}
              placeholder="Apartment, suite, etc."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="landmark">Landmark</Label>
            <Input 
              id="landmark"
              value={formData.landmark} 
              onChange={e => setFormData(f => ({ ...f, landmark: e.target.value }))}
              placeholder="Near..."
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Order Items</h3>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-2" /> Add Item
          </Button>
        </div>
        
        {formData.items.map((item, index) => {
          const itemErrors = errors?.items?.[index];
          const hasItemError = itemErrors && (itemErrors.name || itemErrors.unitPrice || itemErrors.quantity);
          
          return (
            <Card key={index} className={hasItemError ? 'border-red-300' : ''}>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Item #{index + 1}</h4>
                  {formData.items.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeItem(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor={`item-${index}-name`} className={itemErrors?.name ? 'text-red-500' : ''}>
                      Product Name <span className="text-red-500">*</span>
                    </Label>
                    <Input 
                      id={`item-${index}-name`}
                      value={item.name} 
                      onChange={e => {
                        handleItemChange(index, 'name', e.target.value);
                        if (setErrors && itemErrors?.name) {
                          setErrors((prev: any) => {
                            const newErrors = { ...prev };
                            if (newErrors.items && newErrors.items[index]) {
                              delete newErrors.items[index].name;
                              if (Object.keys(newErrors.items[index]).length === 0) {
                                delete newErrors.items[index];
                              }
                            }
                            return newErrors;
                          });
                        }
                      }}
                      className={itemErrors?.name ? 'border-red-500 focus:ring-red-500' : ''}
                      placeholder="Product name"
                    />
                    {itemErrors?.name && <p className="text-xs text-red-500">{itemErrors.name}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`item-${index}-sku`}>SKU</Label>
                    <Input 
                      id={`item-${index}-sku`}
                      value={item.sku || ''} 
                      onChange={e => handleItemChange(index, 'sku', e.target.value)}
                      placeholder="SKU-001"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`item-${index}-price`} className={itemErrors?.unitPrice ? 'text-red-500' : ''}>
                      Unit Price (₹) <span className="text-red-500">*</span>
                    </Label>
                    <Input 
                      id={`item-${index}-price`}
                      type="number"
                      value={item.unitPrice} 
                      onChange={e => {
                        handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0);
                        if (setErrors && itemErrors?.unitPrice) {
                          setErrors((prev: any) => {
                            const newErrors = { ...prev };
                            if (newErrors.items && newErrors.items[index]) {
                              delete newErrors.items[index].unitPrice;
                              if (Object.keys(newErrors.items[index]).length === 0) {
                                delete newErrors.items[index];
                              }
                            }
                            return newErrors;
                          });
                        }
                      }}
                      min="0"
                      step="0.01"
                      className={itemErrors?.unitPrice ? 'border-red-500 focus:ring-red-500' : ''}
                    />
                    {itemErrors?.unitPrice && <p className="text-xs text-red-500">{itemErrors.unitPrice}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`item-${index}-qty`} className={itemErrors?.quantity ? 'text-red-500' : ''}>
                      Quantity <span className="text-red-500">*</span>
                    </Label>
                    <Input 
                      id={`item-${index}-qty`}
                      type="number"
                      value={item.quantity} 
                      onChange={e => {
                        handleItemChange(index, 'quantity', parseInt(e.target.value) || 1);
                        if (setErrors && itemErrors?.quantity) {
                          setErrors((prev: any) => {
                            const newErrors = { ...prev };
                            if (newErrors.items && newErrors.items[index]) {
                              delete newErrors.items[index].quantity;
                              if (Object.keys(newErrors.items[index]).length === 0) {
                                delete newErrors.items[index];
                              }
                            }
                            return newErrors;
                          });
                        }
                      }}
                      min="1"
                      className={itemErrors?.quantity ? 'border-red-500 focus:ring-red-500' : ''}
                    />
                    {itemErrors?.quantity && <p className="text-xs text-red-500">{itemErrors.quantity}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`item-${index}-gst`}>GST Rate (%)</Label>
                    <Select 
                      value={String(item.gstRate)} 
                      onValueChange={v => handleItemChange(index, 'gstRate', parseInt(v))}
                    >
                      <SelectTrigger id={`item-${index}-gst`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 5, 12, 18, 28].map(rate => (
                          <SelectItem key={rate} value={String(rate)}>{rate}%</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`item-${index}-weight`}>Dead Weight (kg)</Label>
                    <Input 
                      id={`item-${index}-weight`}
                      type="number"
                      value={item.deadWeight || ''} 
                      onChange={e => handleItemChange(index, 'deadWeight', parseFloat(e.target.value) || undefined)}
                      min="0"
                      step="0.1"
                      placeholder="0.5"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Ruler className="h-4 w-4" /> Dimensions (cm)
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Input 
                      placeholder="Height"
                      type="number"
                      value={item.height || ''} 
                      onChange={e => handleItemChange(index, 'height', parseFloat(e.target.value) || undefined)}
                      min="0"
                      step="0.1"
                    />
                    <Input 
                      placeholder="Width"
                      type="number"
                      value={item.width || ''} 
                      onChange={e => handleItemChange(index, 'width', parseFloat(e.target.value) || undefined)}
                      min="0"
                      step="0.1"
                    />
                    <Input 
                      placeholder="Length"
                      type="number"
                      value={item.length || ''} 
                      onChange={e => handleItemChange(index, 'length', parseFloat(e.target.value) || undefined)}
                      min="0"
                      step="0.1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                  <div>
                    <Label className="text-xs text-muted-foreground">Volumetric Weight</Label>
                    <p className="text-sm font-medium">
                      {calculateVolumetricWeight(item.height, item.width, item.length) || '-'} kg
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Chargeable Weight</Label>
                    <p className="text-sm font-medium">
                      {calculateChargeableWeight(item).toFixed(2)} kg
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Total Price (incl. GST)</Label>
                    <p className="text-sm font-medium">
                      ₹{calculateTotalPrice(item.unitPrice, item.quantity, item.gstRate)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {errors?.items && Object.keys(errors.items).length > 0 && (
          <p className="text-xs text-red-500">Please fill all required item fields</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Payment Method</Label>
        <Select value={formData.paymentGateway} onValueChange={v => setFormData(f => ({ ...f, paymentGateway: v }))}>
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["Prepaid", "COD"]).map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
          



  

     

      {getuser().role == "admin" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="space-y-2">
        <Label htmlFor="warehouse">Warehouse</Label>
        <Select 
          value={formData.warehouse || (warehouselist_.find(w => w.isDefault)?.id)} 
          onValueChange={v => setFormData(f => ({ ...f, warehouse: v }))}
        >
          <SelectTrigger id="warehouse">
            <SelectValue placeholder="Select Warehouse" />
          </SelectTrigger>
          <SelectContent>
            {warehouselist_.map(s => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} {s.isDefault ? "(Default)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <p className="text-xs text-muted-foreground">Default warehouse will be used if none selected</p>
      </div>


       <div className="space-y-2">
           <Label htmlFor="awb">AWB Number</Label>
          <Input 
             id="awb"
             value={formData.awb} 
             onChange={e => setFormData(f => ({ ...f, awb: e.target.value }))} 
           />
         </div>


         <div className="space-y-2">
         <Label htmlFor="courier">Courier</Label>
          <Select value={formData.courier} onValueChange={v => setFormData(f => ({ ...f, courier: v }))}>
              <SelectTrigger id="courier">
                  <SelectValue placeholder="Select courier" />
               </SelectTrigger>
                <SelectContent>
            {["eKART","SMC", "SMC Air", "SMC Surface", "Amazon","Delhivery","Delhivery Air ","Delhivery Surface","Blue Dart"].map(c => (
                <SelectItem key={c} value={c}>{c === "-" ? "Not Assigned" : c}</SelectItem>
              ))}
           </SelectContent>

           </Select>
              </div>





          <div className="space-y-2">
            <Label htmlFor="seller" className={getError('seller') ? 'text-red-500' : ''}>
              Seller <span className="text-red-500">*</span>
            </Label>
            <Select 
              value={formData.seller} 
              onValueChange={v => {
                setFormData(f => ({ ...f, seller: v }));
                if (setErrors && errors?.seller) {
                  setErrors((prev: any) => ({ ...prev, seller: null }));
                }
              }}
            >
              <SelectTrigger id="seller" className={getError('seller') ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select seller" />
              </SelectTrigger>
              <SelectContent>
                {allsellerlist.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {getError('seller') && <p className="text-xs text-red-500">{getError('seller')}</p>}
          </div>
        </div>
      )}
    </div>
  );
};
async function getLocationByPincode(pincode){
  try {
   
    const response = await fetch(
      `https://api.postalpincode.in/pincode/${pincode}`
    );
    const data = await response.json();


    if (
      data[0].Status === "Success" &&
      data[0].PostOffice &&
      data[0].PostOffice.length > 0
    ) {
      const postOffice = data[0].PostOffice[0];


      
      return {
        city: postOffice.District,
        state: postOffice.State,
        country: postOffice.Country,
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching pincode details:", error);
    return null;
  }
}


const IntegrationConfigDialog = ({ 
  integration, 
  open, 
  onOpenChange,
  onSave,
  onTestConnection
}: { 
  integration: IntegrationConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: IntegrationConfig) => void;
  onTestConnection: (platform: Platform, credentials: any) => Promise<boolean>;
}) => {
                                                      
    // console.log(integration,"integrationintegrationintegrationintegration>>>>>>>>>>>>>>>>")

  const [config, setConfig] = useState<IntegrationConfig | null>(integration);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [showAmazonGuide, setShowAmazonGuide] = useState(false);
  const [showShopifyGuide, setShowShopifyGuide] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setConfig(integration);
    setTestResult(null);
    setShowAmazonGuide(false);
    setShowShopifyGuide(false);
  }, [integration]);

  if (!config) return null;

  // Function to validate credentials based on platform
  const validateCredentials = (): boolean => {

    try{

    switch (config.type) {
      case "Amazon":
        return !!(config.credentials.sellerId && config.credentials.accessToken);
      case "Shopify":
        return !!(config.credentials.storeUrl && config.credentials.accessToken && config.credentials.clientid);
      case "WooCommerce":
        return !!(config.credentials.storeUrl && config.credentials.apiKey && config.credentials.apiSecret);
      case "Custom":
        return !!(config.credentials.storeUrl);
      default:
        return false;
    }

  }
  catch(e){

  }




  };

  const handleTestConnection = async () => {
    // Validate credentials first
    if (!validateCredentials())
       {
      toast({
        title: "Invalid Credentials",
        description: "Please fill in all required fields before testing the connection.",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);
    setTestResult(null);
    
    try {
      const result = await onTestConnection(config.type, config.credentials);
      setTestResult(result);
      
      toast({
        title: result ? "Connection Successful" : "Connection Failed",
        description: result ? "Successfully connected to the platform." : "Failed to connect. Please check your credentials.",
        variant: result ? "default" : "destructive",
      });
    } catch (error) {
      setTestResult(false);
      toast({
        title: "Connection Failed",
        description: "An error occurred while testing the connection.",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    // Validate credentials before saving
    if (!validateCredentials()) 
      {
      toast({
        title: "Invalid Credentials",
        description: "Please fill in all required fields before saving.",
        variant: "destructive",
      });
      return;
    }

    onSave(config);
    onOpenChange(false);
    toast({
      title: "Configuration Saved",
      description: `${config.name} has been configured successfully.`,
    });

  };

  const renderConfigFields = () => {

    // console.log(config,"configconfigconfigconfigconfigconfig")



    switch (config.type) {
      case "Amazon":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="sellerId">Client ID</Label>
              <Input 
                id="sellerId"
                value={config.credentials.sellerId || ''} 
                onChange={e => setConfig(c => ({ 
                  ...c!, 
                  credentials: { ...c!.credentials, sellerId: e.target.value }
                }))}
                placeholder="Enter Amazon Merchant ID"
              />
              <p className="text-xs text-muted-foreground">
                This is your unique Amazon seller identifier
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="marketplaceId">Client ID</Label>
              <Input 
                id="marketplaceId"
                value={config.credentials.marketplaceId || ''} 
                onChange={e => setConfig(c => ({ 
                  ...c!, 
                  credentials: { ...c!.credentials, marketplaceId: e.target.value }
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accessToken">Client Secret</Label>
              <Input 
                id="accessToken"
                type="password"
                value={config.credentials.accessToken || ''} 
                onChange={e => setConfig(c => ({ 
                  ...c!, 
                  credentials: { ...c!.credentials, accessToken: e.target.value }
                }))}
              />
              <p className="text-xs text-muted-foreground">
                The token generated after authorizing KartRocket as a developer
              </p>
            </div>
            
            <Button
              type="button"
              variant="link"
              className="px-0 h-auto text-xs"
              onClick={() => setShowAmazonGuide(!showAmazonGuide)}
            >
              {showAmazonGuide ? "Hide setup guide" : "Need help? View Amazon setup guide"}
            </Button>
            
            {showAmazonGuide && (
              <div className="mt-2">
                <AmazonSetupGuide />
              </div>
            )}
          </>
        );
      
      case "Shopify":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="storeUrl">Shopify URL</Label>
              <Input 
                id="storeUrlm"
                value={config.credentials.storeUrl || ''} 
                onChange={e => setConfig(c => ({ 
                  ...c!, 
                  credentials: { ...c!.credentials, storeUrl: e.target.value }
                }))}
              />
             
            </div>



             <div className="space-y-2">
              <Label htmlFor="storeUrl">Client ID</Label>
              <Input 
                id="storeUrl"
                value={config.credentials.clientid || ''} 
                onChange={e => setConfig(c => ({ 
                  ...c!, 
                  credentials: { ...c!.credentials, clientid: e.target.value }
                }))}
              />
             
            </div>
            <div className="space-y-2">
              <Label htmlFor="accessToken">Client Secret</Label>
              <Input 
                id="accessToken"
                type="password"
                value={config.credentials.accessToken || ''} 
                onChange={e => setConfig(c => ({ 
                  ...c!, 
                  credentials: { ...c!.credentials, accessToken: e.target.value }
                }))}
              />
            
            </div>
            
            <Button
              type="button"
              variant="link"
              className="px-0 h-auto text-xs"
              onClick={() => setShowShopifyGuide(!showShopifyGuide)}
            >
              {showShopifyGuide ? "Hide setup guide" : "Need help? View Shopify setup guide"}
            </Button>
            
            {showShopifyGuide && (
              <div className="mt-2">
                <ShopifySetupGuide />
              </div>
            )}
          </>
        );
      
      case "WooCommerce":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="storeUrl">Store URL *</Label>
              <Input 
                id="storeUrl"
                value={config.credentials.storeUrl || ''} 
                onChange={e => setConfig(c => ({ 
                  ...c!, 
                  credentials: { ...c!.credentials, storeUrl: e.target.value }
                }))}
                placeholder="https://your-store.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">Consumer Key *</Label>
              <Input 
                id="apiKey"
                value={config.credentials.apiKey || ''} 
                onChange={e => setConfig(c => ({ 
                  ...c!, 
                  credentials: { ...c!.credentials, apiKey: e.target.value }
                }))}
                placeholder="Enter WooCommerce consumer key"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiSecret">Consumer Secret *</Label>
              <Input 
                id="apiSecret"
                type="password"
                value={config.credentials.apiSecret || ''} 
                onChange={e => setConfig(c => ({ 
                  ...c!, 
                  credentials: { ...c!.credentials, apiSecret: e.target.value }
                }))}
                placeholder="Enter WooCommerce consumer secret"
              />
            </div>
          </>
        );
      
      case "Custom":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="apiUrl">API URL *</Label>
              <Input 
                id="apiUrl"
                value={config.credentials.storeUrl || ''} 
                onChange={e => setConfig(c => ({ 
                  ...c!, 
                  credentials: { ...c!.credentials, storeUrl: e.target.value }
                }))}
                placeholder="https://your-api.com/orders"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input 
                id="apiKey"
                value={config.credentials.apiKey || ''} 
                onChange={e => setConfig(c => ({ 
                  ...c!, 
                  credentials: { ...c!.credentials, apiKey: e.target.value }
                }))}
                placeholder="Enter your API key"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiSecret">API Secret</Label>
              <Input 
                id="apiSecret"
                type="password"
                value={config.credentials.apiSecret || ''} 
                onChange={e => setConfig(c => ({ 
                  ...c!, 
                  credentials: { ...c!.credentials, apiSecret: e.target.value }
                }))}
                placeholder="Enter your API secret"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhookUrl">Webhook URL (optional)</Label>
              <Input 
                id="webhookUrl"
                value={config.credentials.webhookUrl || ''} 
                onChange={e => setConfig(c => ({ 
                  ...c!, 
                  credentials: { ...c!.credentials, webhookUrl: e.target.value }
                }))}
                placeholder="https://your-server.com/webhook"
              />
            </div>
          </>
        );
      
      default:
        return null;
    }
  };

  const isValid = validateCredentials();
return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Configure {integration?.name}</DialogTitle>
          <DialogDescription>
            Enter your API credentials to enable order synchronization. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {renderConfigFields()}
          
          <div className="flex items-center justify-between pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleTestConnection}
              disabled={testing || !isValid}
            >
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing...
                </>
              ) : (
                <>Test Connection</>
              )}
            </Button>
            
            {testResult !== null && (
              <div className="flex items-center gap-2">
                {testResult ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600">Connected</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-600">Failed</span>
                  </>
                )}
              </div>
            )}
          </div>
          
          {!isValid && (
            <p className="text-xs text-red-500 mt-2">
              Please fill in all required fields (*) before testing or saving.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
let tmpzone=""
const OrdersPage = () => {
  
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [orderDirection, setOrderDirection] = useState<"forward" | "reverse">("forward");
  const [orderScope, setOrderScope] = useState<"domestic" | "international">("domestic");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [courier__, setcourier__] = useState<string>("all");
  const [paymentmood, setpaymentmood] = useState<string>("all"); 

const [dateFrom, setDateFrom] = useState<string>("");
const [dateTo, setDateTo] = useState<string>("");
const [showDateFilter, setShowDateFilter] = useState(false);
const [refSearch, setRefSearch] = useState("");
const [awbSearch, setAwbSearch] = useState("");
const [showMoreFilters, setShowMoreFilters] = useState(false);
const [dateType, setDateType] = useState("Order Created");
const [countOrders, setCountOrders] = useState<Order[]>([]);

const [formErrors, setFormErrors] = useState<any>({});
  const [warehouselist,setwarehouselist]=useState([])
  warehouselist_=warehouselist
  const [proof,setproof]=useState("")

  const [viewOrder, setViewOrder] = useState<Order | null>(null);

  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createOpen__, setCreateOpen__] = useState(false);
  const [deleteOrder, setDeleteOrder] = useState<Order | null>(null);
  const [disputeOrder, setdisputeOrder] = useState<Order | null>(null);
  const [bulkcreatemodal, setbulkcreatemodal] = useState(false);
  const [singleor,setsingleor]=useState(false)
  

  const [formData, setFormData] = useState(emptyOrder);

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<SyncResult[]>([]);
  const [showSyncResults, setShowSyncResults] = useState(false);
  const [showShopifyManualSync, setShowShopifyManualSync] = useState(false);
  const [shopifySyncFromDate, setShopifySyncFromDate] = useState("");
  const [shopifySyncToDate, setShopifySyncToDate] = useState("");
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationConfig | null>(null);
  const [showIntegrationConfig, setShowIntegrationConfig] = useState(false);
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>(DEFAULT_INTEGRATIONS);
  const [loadingIntegrations, setLoadingIntegrations] = useState(true);
  const [rendertmp, setrendertmp] = useState(true);
  let [bulkshipmentcreate, setbulkshipmentcreate] = useState({coureir:[],orderlist:[],id:[],ratelist:{},warehouselist:[],dispatchdate:{},zone:[]});
  const [allsellerlist, setallsellerlist] = useState([]);
  const [allsellerlistid, setallsellerlistid] = useState({});

  let [ratelist, setratelist] = useState({});

bulkshipmentcreate.ratelist={...ratelist}
const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
const [uploadFile, setUploadFile] = useState<File | null>(null);
const [uploadPreview, setUploadPreview] = useState<any[]>([]);
const [uploadProcessing, setUploadProcessing] = useState(false);
const [uploadErrors, setUploadErrors] = useState<string[]>([]);
const [trackorder_, settrackorder_] = useState(false);
const [trackorderdata, settrackorderdata] = useState([]);




  let [rawData,setrawData]=useState([])
 
const northEastStates = [
  "arunachal pradesh",
  "assam",
  "manipur",
  "meghalaya",
  "mizoram",
  "nagaland",
  "sikkim",
  "tripura",
  "shimla",
  "jammu & kashmir"


];

  const metroCities = [
  "mumbai", 
  "delhi",
  "new delhi", 
  "bengaluru", 
  "chennai", 
  "hyderabad", 
  "ahmedabad", 
  "kolkata",   
  "pune",
  "noida",
  "gautam buddha nagar",
  "jaipur",
  "lucknow",
];
// https://api.postalpincode.in/pincode/




  // Fetch integrations from API
  useEffect(() => {
    fetchIntegrations();
  }, [rendertmp]);



const getWarehouses = async () => {
  let response =await apiRequest("GET","auth/getAllWarehouses",{},{})
  response.data.data.map((val)=>{
warelistbyid[val.id]=val
  })
  setwarehouselist(getuser().role=="admin"?[...response.data.data.filter((val)=> val.isActive==true)]:[...response.data.data.filter((val)=>val.user_id==getuserid() && val.isActive==true)])
}




  useEffect(() => {
    getWarehouses();
  }, [rendertmp]);

  const fetchIntegrations = async () => {
    try {
      setLoadingIntegrations(true);
      const data = await integrationApi.getAll();


      // console.log(data,"datadatadatadatadatadatadatadata")
      // Ensure data is an array
      if (Array.isArray(data.data)) {
        try{
        let tmpstore=[]
for(let x of DEFAULT_INTEGRATIONS){
  let check=false
  for(let y of data.data){
    if(x?.name==y?.name && y?.user_id==getuserid()){
      check=true
      tmpstore.push(y)
    }
      
  }
  if(!check){
    tmpstore.push(x)
  }
}
      

        setIntegrations(tmpstore);
}
catch(e){
        console.log(e,"LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL")

}
      } else {
        console.error("Integrations API did not return an array:", data);
        setIntegrations(DEFAULT_INTEGRATIONS);
      }
    } catch (error) {
      console.error("Failed to fetch integrations:", error);
      setIntegrations(DEFAULT_INTEGRATIONS);
      toast({
        title: "Warning",
        description: "Failed to load integrations from server. Using default integrations.",
        variant: "destructive",
      });
    } finally {
      setLoadingIntegrations(false);
    }
  };

  const fetchOrders = async (page = currentPage, limit = itemsPerPage) => {
    try {
      setLoading(true);
      const result = await orderApi.getAll({
        // page,
        // limit,
        // search: awbSearch || refSearch || search || undefined,
        // status: statusFilter !== 'all' ? statusFilter : undefined,
        // platform: platformFilter !== 'all' ? platformFilter : undefined,
        // startDate: dateFrom || undefined,
        // endDate: dateTo || undefined,
        // courier: courier__ !== 'all' ? courier__ : undefined,
        // financialStatus: paymentmood !== 'all' ? paymentmood : undefined,
      });


      console.log(result,"resultresultresultresultresultresultresultresultresultresultresultresult")
      const data = result.orders || result;
      const pagination = result.pagination;
      const data2 = await sellerApi.getAll();
      storetmpdata.ordernumber = [];
      for (let x of data) {
        storetmpdata.ordernumber.push(x.orderNumber);
      }




      setOrders(data);
      if (pagination) {
        setTotalOrdersCount(pagination.total);
        setServerTotalPages(pagination.totalPages);
      } else {
        setTotalOrdersCount(data.length);
        setServerTotalPages(Math.ceil(data.length / limit) || 1);
      }
      let temp = {};
      for (let x of data2 || []) {
        temp[x.id] = x;
      }
      setallsellerlistid(temp);
      setallsellerlist(data2 || []);
    } catch (error) {


      console.log(error,"errorerrorerrorerrorerrorerrorerrorerrorerrorerrorerrorerror")
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  // console.log(orders,"ordersordersordersordersordersordersordersorders") 




// const sortedOrders = [...orders].sort((a, b) => new Date(b.platform=="Shopify"?b.orderDate:b.createdAt) - new Date(a.platform=="Shopify"?a.orderDate:a.createdAt));
const sortedOrders = [...orders]
// .sort((a, b) => new Date(b.platform=="Shopify"?b.orderDate:b.createdAt) - new Date(a.platform=="Shopify"?a.orderDate:a.createdAt));





// Server-side pagination: filters are applied on the API; use page data directly.
const paginatedOrders = sortedOrders;


  const [currentPage, setCurrentPage] = useState(1);
const [itemsPerPage, setItemsPerPage] = useState(10);
const [totalOrdersCount, setTotalOrdersCount] = useState(0);
const [serverTotalPages, setServerTotalPages] = useState(1);

const totalPages = serverTotalPages || Math.ceil(totalOrdersCount / itemsPerPage) || 1;
const startIndex = (currentPage - 1) * itemsPerPage;
const endIndex = startIndex + itemsPerPage;


const [rtocharge,setrtocharge]=useState([])
const [rtocharge1,setrtocharge1]=useState([])


// useEffect(() => {
//   setCurrentPage(1);
// }, [search, statusFilter, platformFilter]);

useEffect(() => {
  setCurrentPage(1);
}, [search, statusFilter, platformFilter, courier__, paymentmood, dateFrom, dateTo, refSearch, awbSearch]);

useEffect(() => {
  fetchOrders(currentPage, itemsPerPage);
}, [currentPage, itemsPerPage, search, statusFilter, platformFilter, dateFrom, dateTo, courier__, paymentmood, refSearch, awbSearch]);

useEffect(() => {
  const loadCounts = async () => {
    try {
      const result = await orderApi.getAll({ paginate: "false" });
      const data = result?.orders ?? (Array.isArray(result) ? result : []);
      setCountOrders(Array.isArray(data) ? data : []);
    } catch {
      setCountOrders([]);
    }
  };
  loadCounts();
}, []);

  const statusCounts = useMemo(() => computeStatusCounts(countOrders), [countOrders]);

  const stats = {
    total: orders.length,
    delivered: orders.filter(o => o.status === "Delivered").length,
    rto: orders.filter(o => o.status === "RTO").length,
    pending: orders.filter(o => o.status === "Pending").length,
    amazon: orders.filter(o => o.platform === "Amazon").length,
    shopify: orders.filter(o => o.platform === "Shopify").length,
    woocommerce: orders.filter(o => o.platform === "WooCommerce").length,
    custom: orders.filter(o => o.platform === "Custom").length,
  };

  const calculateVolumetricWeight = (height?: number, width?: number, length?: number): number | undefined => {
    if (!height || !width || !length) return undefined;
    return Number(((height * width * length) / 5000).toFixed(2));
  };

  const calculateTotalPrice = (unitPrice: number, quantity: number, gstRate: number): number => {
    const subtotal = unitPrice * quantity;
    const gstAmount = (subtotal * gstRate) / 100;
    return Number((subtotal + gstAmount).toFixed(2));
  };
  const validateForm = (data: typeof emptyOrder, userRole: string): { isValid: boolean; errors: FormErrors } => {
  const currentErrors: FormErrors = {};
  
  // 1. Order Number Validation
  if (!data.orderNumber || !data.orderNumber.trim()) {
    currentErrors.orderNumber = "Order Number is required";
  }

  // 2. Customer Information Validation
  if (!data.customerName || !data.customerName.trim()) {
    currentErrors.customerName = "Customer Name is required";
  }

  const phoneRegex = /^[6-9]\d{9}$/;
  if (!data.customerPhone || !data.customerPhone.trim()) {
    currentErrors.customerPhone = "Phone number is required";
  } else if (!phoneRegex.test(data.customerPhone)) {
    currentErrors.customerPhone = "Enter a valid 10-digit mobile number";
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (data.customerEmail && data.customerEmail.trim() && !emailRegex.test(data.customerEmail)) {
    currentErrors.customerEmail = "Enter a valid Email Address";
  }

  // 3. Shipping Address Validation
  if (!data.pincode || !data.pincode.toString().trim()) {
    currentErrors.pincode = "Pincode is required";
  } else if (!/^\d{6}$/.test(data.pincode.toString().trim())) {
    currentErrors.pincode = "Pincode must be exactly 6 digits";
  }

  if (!data.city || !data.city.trim()) {
    currentErrors.city = "City is required";
  }

  if (!data.state || !data.state.trim()) {
    currentErrors.state = "State is required";
  }

  if (!data.addressLine1 || !data.addressLine1.trim()) {
    currentErrors.addressLine1 = "Address Line 1 is required";
  }

  // 4. Admin-Specific Validation
  // if (userRole === "admin" && (!data.seller || !data.seller.trim())) {
  //   currentErrors.seller = "Seller selection is required for admins";
  // }

  // 5. Order Items Validation (Loops through all dynamic items)
  if (data.items && data.items.length > 0) {
    const itemErrorsArray: Array<{ name?: string; unitPrice?: string; quantity?: string }> = [];
    let hasItemErrors = false;

    data.items.forEach((item, index) => {
      const itemError: { name?: string; unitPrice?: string; quantity?: string } = {};

      if (!item.name || !item.name.trim()) {
        itemError.name = "Product name is required";
        hasItemErrors = true;
      }

      if (item.unitPrice === undefined || item.unitPrice === null || Number(item.unitPrice) <= 0) {
        itemError.unitPrice = "Price must be greater than 0";
        hasItemErrors = true;
      }

      if (!item.quantity || Number(item.quantity) < 1) {
        itemError.quantity = "Quantity must be 1 or more";
        hasItemErrors = true;
      }

      itemErrorsArray[index] = itemError;
    });

    if (hasItemErrors) {
      currentErrors.items = itemErrorsArray;
    }
  } else {
    // Edge case: If they managed to delete all items
    currentErrors.orderNumber = currentErrors.orderNumber || "At least one order item is required";
  }

  // The form is valid if our errors object has no root keys
  return {
    isValid: Object.keys(currentErrors).length === 0,
    errors: currentErrors
  };
};

  // const handleCreate = async () => {
  
  // // Run the validator
  // const { isValid, errors: validationErrors } = validateForm(formData, getuser().role);
  //  console.log(validationErrors,"validationErrorsvalidationErrorsvalidationErrors")
  
  // if (!isValid) {
  //   console.log(validationErrors,"validationErrorsvalidationErrorsvalidationErrorsvalidationErrorsvalidationErrorsvalidationErrors")
  //   // 1. Pass the errors back down to your FormFields component to show them visually
  //   // setErrors(validationErrors); 
    
  //   // 2. Stop submission
  //   alert("Please fix the validation errors in the form.");
  //   return;
  // }
  //   try {
  //     const totalAmount = formData.items.reduce((sum, item) => {
  //       const total = calculateTotalPrice(item.unitPrice, item.quantity, item.gstRate);
  //       return sum + total;
  //     }, 0);

  //     let orderData = {
  //       ...formData,
  //       amount: `₹${totalAmount.toFixed(2)}`,
  //       items: formData.items.map(item => ({
  //         ...item,
  //         volumetricWeight: calculateVolumetricWeight(item.height, item.width, item.length),
  //         totalPrice: calculateTotalPrice(item.unitPrice, item.quantity, item.gstRate)
  //       }))
  //     };  
  //     orderData.financialStatus=orderData.paymentGateway=="COD"?"pending":"paid"
  //     orderData.seller=getuser()?.role=="admin"?orderData.seller:getuser()?.id
  //     orderData.user_id=getuser()?.role=="admin"?orderData.seller:getuser()?.id

  //     const newOrder = await orderApi.mancreate([orderData]);
  //   fetchOrders()
  //     setFormData(emptyOrder);
  //     toast({ title: "Success", description: "Order created successfully" });
  //   } catch (error) {
  //     toast({
  //       title: "Error",
  //       description: "Failed to create order",
  //       variant: "destructive",
  //     });
  //   }
  // };
const handleCreate = async () => {
  // Run the validator
  const { isValid, errors: validationErrors } = validateForm(formData, getuser().role);
  
  if (!isValid) {
    setFormErrors(validationErrors);
    alert("Please fix the validation errors in the form.");
    return;
  }
  
  try {
    const totalAmount = formData.items.reduce((sum, item) => {
      const total = calculateTotalPrice(item.unitPrice, item.quantity, item.gstRate);
      return sum + total;
    }, 0);

    let orderData = {
      ...formData,
      amount: `₹${totalAmount.toFixed(2)}`,
      items: formData.items.map(item => ({
        ...item,
        volumetricWeight: calculateVolumetricWeight(item.height, item.width, item.length),
        totalPrice: calculateTotalPrice(item.unitPrice, item.quantity, item.gstRate)
      }))
    };  
    orderData.financialStatus = orderData.paymentGateway == "COD" ? "pending" : "paid";
    orderData.seller = getuser()?.role == "admin" ? orderData.seller : getuser()?.id;
    orderData.user_id = getuser()?.role == "admin" ? orderData.seller : getuser()?.id;

    const newOrder = await orderApi.mancreate([orderData]);
    fetchOrders();
    setFormData(emptyOrder);
    setFormErrors({});
    toast({ title: "Success", description: "Order created successfully" });
    setCreateOpen(false);
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to create order",
      variant: "destructive",
    });
  }
};
  // const handleUpdate = async () => {
  //   //  Run the validator
  // const { isValid, errors: validationErrors } = validateForm(formData, getuser().role);
  
  // if (!isValid) {
  //   // 1. Pass the errors back down to your FormFields component to show them visually
  //   // setErrors(validationErrors); 
    
  //   // 2. Stop submission
  //   alert("Please fix the validation errors in the form.");
  //   return;
  // }

  //   if (!editOrder) return;
  //   try {

  //     const totalAmount = formData.items.reduce((sum, item) => {
  //       const total = calculateTotalPrice(item.unitPrice, item.quantity, item.gstRate);
  //       return sum + total;
  //     }, 0);

  //     let orderData = {
  //       ...formData,
  //       amount: `₹${totalAmount.toFixed(2)}`,
  //       items: formData.items.map(item => ({
  //         ...item,
  //         volumetricWeight: calculateVolumetricWeight(item.height, item.width, item.length),
  //         totalPrice: calculateTotalPrice(item.unitPrice, item.quantity, item.gstRate)
  //       }))
  //     };
       
  //       orderData.financialStatus=orderData.paymentGateway=="COD" || orderData.paymentGateway=="Cash on Delivery (COD)"?"pending":orderData.paymentGateway=="manual"? orderData.financialStatus:"paid"  
  //       orderData.seller=getuser()?.role=="admin"?orderData.seller:getuser()?.id  
  //       orderData.user_id=getuser()?.role=="admin"?orderData.seller:getuser()?.id
   


  //     const updated = await orderApi.update(editOrder.id, orderData);
  //     setOrders(prev => prev.map(o => o.id === editOrder.id ? updated : o));
  //     setEditOrder(null);
  //     toast({ title: "Success", description: "Order updated successfully" });
  //   } catch (error) {
  //     toast({
  //       title: "Error",
  //       description: "Failed to update order",
  //       variant: "destructive",
  //     });
  //   }
  // };
const handleUpdate = async () => {
  const { isValid, errors: validationErrors } = validateForm(formData, getuser().role);
  
  if (!isValid) {
    setFormErrors(validationErrors);
    alert("Please fix the validation errors in the form.");
    return;
  }

  if (!editOrder) return;
  try {
    const totalAmount = formData.items.reduce((sum, item) => {
      const total = calculateTotalPrice(item.unitPrice, item.quantity, item.gstRate);
      return sum + total;
    }, 0);

    let orderData = {
      ...formData,
      amount: `₹${totalAmount.toFixed(2)}`,
      items: formData.items.map(item => ({
        ...item,
        volumetricWeight: calculateVolumetricWeight(item.height, item.width, item.length),
        totalPrice: calculateTotalPrice(item.unitPrice, item.quantity, item.gstRate)
      }))
    };
     
    orderData.financialStatus = orderData.paymentGateway == "COD" || orderData.paymentGateway == "Cash on Delivery (COD)" ? "pending" : orderData.paymentGateway == "manual" ? orderData.financialStatus : "paid";  
    orderData.seller = getuser()?.role == "admin" ? orderData.seller : getuser()?.id;  
    orderData.user_id = getuser()?.role == "admin" ? orderData.seller : getuser()?.id;

    const updated = await orderApi.update(editOrder.id, orderData);
    setOrders(prev => prev.map(o => o.id === editOrder.id ? updated : o));
    setEditOrder(null);
    setFormErrors({});
    toast({ title: "Success", description: "Order updated successfully" });
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to update order",
      variant: "destructive",
    });
  }
};
  const handleDelete = async () => {
    if (!deleteOrder) return;
    try {
      await orderApi.delete(deleteOrder.id);
      setOrders(prev => prev.filter(o => o.id !== deleteOrder.id));
      setDeleteOrder(null);
      toast({ title: "Success", description: "Order deleted successfully" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete order",
        variant: "destructive",
      });
    }
  };



  const handleDispute = async () => {
    if (!disputeOrder) return;
    try {
      let payload={

dispute_status:"Disputed",
dispute_file_:proof,
dispute_file:"",
orderNumber:disputeOrder.orderNumber,
dispute_reason:"",
claimweight:sessionStorage.getItem("claimweight"),
previousweight:sessionStorage.getItem("previousweight"),


}

let response=await apiRequest("POST","orders/dispute_order",payload,{})

      if(response.status==200){
      setdisputeOrder(null);
      toast({ title: "Success", description: "Order disputed successfully" });
      }
      else{
        setdisputeOrder(null);
     toast({
        title: "Error",
        description: "Failed  order",
        variant: "destructive",
      });
      }
    } catch (error) {
      setdisputeOrder(null);

      toast({
        title: "Error",
        description: "Failed  order",
        variant: "destructive",
      });
    }
    fetchOrders()
  };


  
  console.log(formData,"formDataformDataformDataformDataformData")

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const updated = await orderApi.updateStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
      toast({ title: "Success", description: `Status updated to ${newStatus}` });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };
// const openEdit = (order) => {
//   console.log(order,"orderorderorderorderorderorderorderorderorderorderorderorderorderorderorderorder")
//   setFormData({
//     orderNumber: order.orderNumber,
//     customerName: order.customerName,
//     customerPhone: order.customerPhone,
//     customerEmail: order.customerEmail || "",
//     seller: order.seller,
//     courier: order.courier,
//     status: order.status,
//     amount: order.amount,
//     orderDate: order.orderDate,
//     awb: order.awb,
//     platform: order.platform,
//     pincode: order.pincode,
//     city: order.city,
//     state: order.state,
//     warehouse: order.warehouse || "",
//     addressLine1: order.addressLine1,
//     addressLine2: order.addressLine2 || "",
//     landmark: order.landmark || "",
//     items: order.items.map(item => ({
//       name: item.name,
//       unitPrice: item.unitPrice,
//       quantity: item.quantity,
//       gstRate: item.gstRate,
//       height: item.height,
//       width: item.width,
//       length: item.length,
//       deadWeight: item.deadWeight,
//     })),
    
//     // Additional fields from emptyOrder
//     user_id: order.user_id || null,
//     totalItems: order.totalItems || 0,
//     totalWeight: order.totalWeight,
//     totalVolumetricWeight: order.totalVolumetricWeight,
//     shopifyOrderId: order.shopifyOrderId || null,
//     financialStatus: order.financialStatus || "pending",
//     fulfillmentStatus: order.fulfillmentStatus || null,
//     paymentGateway: order.paymentGateway || "manual",
//     subtotalPrice: order.subtotalPrice || null,
//     totalTax: order.totalTax || 0,
//     totalDiscounts: order.totalDiscounts || 0,
//     totalShippingPrice: order.totalShippingPrice || 0,
//     totalOutstanding: order.totalOutstanding || 0,
//     currency: order.currency || "INR",
//     taxesIncluded: order.taxesIncluded || false,
//     taxExempt: order.taxExempt || false,
//     confirmationNumber: order.confirmationNumber || null,
//     checkoutId: order.checkoutId || null,
//     checkoutToken: order.checkoutToken || null,
//     orderStatusUrl: order.orderStatusUrl || null,
//     sourceName: order.sourceName || null,
//     browserIp: order.browserIp || null,
//     userAgent: order.userAgent || null,
//     shippingAddress: order.shippingAddress || null,
//     billingAddress: order.billingAddress || null,
//     customerData: order.customerData || null,
//     processedAt: order.processedAt || null,
//     cancelledAt: order.cancelledAt || null,
//     cancelReason: order.cancelReason || null,
//     trackingnumber: order.trackingnumber || null,
//   });
//   setEditOrder(order);
// };


const openEdit = (order) => {
  console.log(order, "orderorderorderorderorderorderorderorderorderorderorderorderorderorderorderorder");
  setFormErrors({});
  setFormData({
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail || "",
    seller: order.seller,
    courier: order.courier,
    status: order.status,
    amount: order.amount,
    orderDate: order.orderDate,
    awb: order.awb,
    platform: order.platform,
    pincode: order.pincode,
    city: order.city,
    state: order.state,
    warehouse: order.warehouse || "",
    addressLine1: order.addressLine1,
    addressLine2: order.addressLine2 || "",
    landmark: order.landmark || "",
    items: order.items.map(item => ({
      name: item.name,
      sku: item.sku || "",  // Add SKU field
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      gstRate: item.gstRate,
      height: item.height,
      width: item.width,
      length: item.length,
      deadWeight: item.deadWeight,
    })),
    
    // Additional fields from emptyOrder
    user_id: order.user_id || null,
    totalItems: order.totalItems || 0,
    totalWeight: order.totalWeight,
    totalVolumetricWeight: order.totalVolumetricWeight,
    shopifyOrderId: order.shopifyOrderId || null,
    financialStatus: order.financialStatus || "pending",
    fulfillmentStatus: order.fulfillmentStatus || null,
    paymentGateway: order.paymentGateway || "manual",
    subtotalPrice: order.subtotalPrice || null,
    totalTax: order.totalTax || 0,
    totalDiscounts: order.totalDiscounts || 0,
    totalShippingPrice: order.totalShippingPrice || 0,
    totalOutstanding: order.totalOutstanding || 0,
    currency: order.currency || "INR",
    taxesIncluded: order.taxesIncluded || false,
    taxExempt: order.taxExempt || false,
    confirmationNumber: order.confirmationNumber || null,
    checkoutId: order.checkoutId || null,
    checkoutToken: order.checkoutToken || null,
    orderStatusUrl: order.orderStatusUrl || null,
    sourceName: order.sourceName || null,
    browserIp: order.browserIp || null,
    userAgent: order.userAgent || null,
    shippingAddress: order.shippingAddress || null,
    billingAddress: order.billingAddress || null,
    customerData: order.customerData || null,
    processedAt: order.processedAt || null,
    cancelledAt: order.cancelledAt || null,
    cancelReason: order.cancelReason || null,
    trackingnumber: order.trackingnumber || null,
  });
  setEditOrder(order);
};




console.log(courier__,"courier__courier__courier__courier__   ")


  // const openEdit = (order: Order) => {
  //   setFormData({
  //     orderNumber: order.orderNumber,
  //     customerName: order.customerName,
  //     customerPhone: order.customerPhone,
  //     customerEmail: order.customerEmail || "",
  //     seller: order.seller,
  //     courier: order.courier,
  //     status: order.status,
  //     amount: order.amount,
  //     orderDate: order.orderDate,
  //     awb: order.awb,
  //     platform: order.platform,
  //     pincode: order.pincode,
  //     city: order.city,
  //     state: order.state,
  //     addressLine1: order.addressLine1,
  //     addressLine2: order.addressLine2 || "",
  //     landmark: order.landmark || "",
  //     items: order.items.map(item => ({
  //       name: item.name,
  //       unitPrice: item.unitPrice,
  //       quantity: item.quantity,
  //       gstRate: item.gstRate,
  //       height: item.height,
  //       width: item.width,
  //       length: item.length,
  //       deadWeight: item.deadWeight,
  //     })),
  //   });
  //   setEditOrder(order);
  // };

  const handleItemChange = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { ...emptyOrderItem }],
    });
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData({ ...formData, items: newItems });
    }
  };

  const getDateAtTime = (dateValue: string, endOfDay = false) => {
    const date = new Date(dateValue);
    date.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
    return date;
  };

  const handleSync = async (type?: Platform, manualDateFrom?: Date, manualDateTo?: Date) => {
    setIsSyncing(true);
    setShowSyncResults(true);
    
    // Ensure integrations is an array
    const activeIntegrations = Array.isArray(integrations) ? integrations.filter(i => i.isActive) : [];
    const syncManager = new SyncManager(activeIntegrations);


    // console.log(activeIntegrations,syncManager,"syncManagersyncManager")
    
    try {
      const dateTo = manualDateTo || new Date();
      const dateFrom = manualDateFrom || new Date();
      if (!manualDateFrom) {
        dateFrom.setDate(dateFrom.getDate() - 7);
      }
      
      let results: SyncResult[];
      
      if (type) {
        const result = await syncManager.syncByType(type, dateFrom, dateTo);
        results = [result];
      } else {
        results = await syncManager.syncAll(dateFrom, dateTo);
      }

      console.log(results,"resultmmmmmmmmmmmmmmmmmmm",type)
      
      setSyncResults(results);
      setLastSyncTime(new Date().toLocaleString());
  
  
      
  
        await fetchOrders();
      
      
      results.forEach(result => {
        if (result.success) {
          toast({
            title: `${result.platform} Sync Completed`,
            description: `Synced ${result.ordersSynced} orders`,
          });
        } else {
          toast({
            title: `${result.platform} Sync Failed`,
            description: result.errors?.[0] || "Unknown error",
            variant: "destructive",
          });
        }
      });
    } catch (error: any) {
      toast({
        title: "Sync Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualShopifySync = async () => {
    if (!shopifySyncFromDate || !shopifySyncToDate) {
      toast({
        title: "Date required",
        description: "Please select both from and to date for Shopify sync.",
        variant: "destructive",
      });
      return;
    }

    const manualDateFrom = getDateAtTime(shopifySyncFromDate);
    const manualDateTo = getDateAtTime(shopifySyncToDate, true);

    if (manualDateFrom > manualDateTo) {
      toast({
        title: "Invalid date range",
        description: "From date cannot be after to date.",
        variant: "destructive",
      });
      return;
    }

    setShowShopifyManualSync(false);
    await handleSync("Shopify", manualDateFrom, manualDateTo);
  };

  const toggleIntegration = async (integrationId: string) => {
    // Ensure integrations is an array
    if (!Array.isArray(integrations)) {
      setIntegrations(DEFAULT_INTEGRATIONS);
      return;
    }
    
    const integration = integrations.find(i => i.id === integrationId);
    if (!integration) return;




    console.log(integration,"KKKKKKKKKKKKKKKKKKKKKKKK")
    
    // Check if integration has proper credentials before enabling
    if (!integration?.isActive) {
      // Check if credentials are configured
      let hasCredentials = false;
      switch (integration?.type) {
        case "Amazon":
          hasCredentials = !!(integration.credentials.sellerId && integration.credentials.accessToken);
          break;
        case "Shopify":
          hasCredentials = !!(integration.credentials.storeUrl && integration.credentials.accessToken && integration.credentials.clientid);
          break;
        case "WooCommerce":
          hasCredentials = !!(integration.credentials.storeUrl && integration.credentials.apiKey && integration.credentials.apiSecret);
          break;
        case "Custom":
          hasCredentials = !!(integration.credentials.storeUrl);
          break;
        default:
          hasCredentials = false;
      }
      
      if (!hasCredentials) {
        toast({
          title: "Cannot Enable Integration",
          description: `Please configure ${integration?.name} credentials first.`,
          variant: "destructive",
        });
        openIntegrationConfig(integration!);
        return;
      }
    }
    
    try {
      const updatedIntegration = { ...integration!, isActive: !integration.isActive };
      await integrationApi.update(integrationId, updatedIntegration);
  
      toast({
        title: integration?.isActive ? "Integration Disabled" : "Integration Enabled",
        description: `${integration?.name} has been ${integration?.isActive ? 'disabled' : 'enabled'}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update integration status",
        variant: "destructive",
      });
    }
  };

  const openIntegrationConfig = (integration: IntegrationConfig) => {
    console.log(integration,"integrationintegrationintegrationintegrationintegration")
    setSelectedIntegration(integration);
    setShowIntegrationConfig(true);
  };

  const handleTestConnection = async (platform: Platform, credentials: any): Promise<boolean> => {
    try {
      const result = await integrationApi.testConnection(platform, credentials);
      return result.success;
    } catch (error) {
      console.error("Test connection failed:", error);
      return false;
    }
  };

  const handleSaveIntegration = async (updatedConfig: IntegrationConfig) => {
    try {
      // Check if integration exists (has valid ID from backend)
      const existingIntegration = Array.isArray(integrations) 
        ? integrations.find(i => i.id === updatedConfig.id)
        : null;
      
      let savedIntegration;
      if (existingIntegration && existingIntegration.id !== 'amazon-1' && existingIntegration.id !== 'shopify-1' && 
          existingIntegration.id !== 'woo-1' && existingIntegration.id !== 'custom-1') {
        // Update existing integration
        savedIntegration = await integrationApi.update(updatedConfig.id, updatedConfig);
      } else {
        // Create new integration
        savedIntegration = await integrationApi.create(updatedConfig);
      }
      
      setrendertmp(!rendertmp)
      // setIntegrations(prev => {
      //   if (!Array.isArray(prev)) return [savedIntegration];
      //   return prev.map(i => 
      //     i.id === updatedConfig.id ? savedIntegration : i
      //   );
      // });
      
      toast({
        title: "Configuration Saved",
        description: ` configuration has been saved. You can now enable the integration.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save integration configuration",
        variant: "destructive",
      });
    }
  };

  // Safe function to check if integration is active
  const isIntegrationActive = (type: Platform): boolean => {
    if (!Array.isArray(integrations)) return false;
    const integration = integrations.find(i => i.type === type);
    return integration?.isActive || false;
    
  };

  async function createshipmentfuntion(){
    let response=await orderApi.bulkshipmentcreate(bulkshipmentcreate)
    alert(response.message)
    setrendertmp(!rendertmp)


// setbulkshipmentcreate({coureir:[],orderlist:[],id:[],ratelist:{},warehouselist:[],dispatchdate:{}})




  }

  async function Shippmentcancel(order_){

 let response=await orderApi.Shippmentcancel(order_.orderNumber,order_.seller)
    alert(response?.message)
    setrendertmp(!rendertmp)
    fetchOrders()
  }


  /**
 * Converts a raw order object into a shipment request payload.
 * @param {Object} order - The complete order object (like the one provided).
 * @param {string} originPincode - Origin pincode (default: "201303").
 * @returns {Object} Shipment object ready for API consumption.
 */
function convertOrderToShipment(order, originPincode = "") {
    // Helper: clean amount string (e.g., "₹297.36" -> 297.36)
    const parseAmount = (amountStr) => {
        const numeric = amountStr.replace(/[^0-9.-]/g, '');
        return parseFloat(numeric) || 0;
    };

    // Determine payment mode based on financial status
    const paymentMode = order.financialStatus === "paid" ? "PREPAID" : "COD";

    // Get delivery pincode from order's top-level pincode or shipping address
    const deliveryPincode = order.pincode || order.shippingAddress?.zip || "";

    // Calculate total invoice value (fallback to amount if subtotal+tax missing)
    let invoiceValue = 0;
    if (order.subtotalPrice && order.totalTax) {
        invoiceValue = parseFloat(order.subtotalPrice) + parseFloat(order.totalTax);
    } else {
        invoiceValue = parseAmount(order.amount);
    }

    // Extract weight (use totalWeight if available, otherwise sum items' deadWeight)
    let weight = order.totalWeight || 0;
    if (!weight && order.items && order.items.length) {
        weight = order.items.reduce((sum, item) => sum + (item.deadWeight || 0), 0);
    }
    weight = parseFloat(weight) || 0.1; // fallback to 0.1 kg if no weight found

    // Compute dimensions from items (max length, width, height if available)
    let dimensions = { length: 12, width: 12, height: 10 }; // default
    if (order.items && order.items.length) {
        let maxLen = 0, maxWid = 0, maxHei = 0;
        let hasAnyDim = false;
        for (const item of order.items) {
            if (item.length && item.length > maxLen) maxLen = item.length;
            if (item.width && item.width > maxWid) maxWid = item.width;
            if (item.height && item.height > maxHei) maxHei = item.height;
            if (item.length || item.width || item.height) hasAnyDim = true;
        }
        if (hasAnyDim) {
            dimensions = {
                length: maxLen || 10,
                width: maxWid || 10,
                height: maxHei || 10
            };
        }
    }

    // Build the final shipment object
    return {
        shipmentType: "FORWARD",
        packageType: "SPS",
        originPincode: originPincode,
        deliveryPincode: deliveryPincode,
        paymentMode: paymentMode,
        weight: weight, // in kg
        invoiceValue: invoiceValue, // numeric value in INR
        dimensions: dimensions,
        serviceType: "domestic"
    };
}

/**
 * Converts an order object (Shopify/WooCommerce format) into a shipment request.
 * @param {Object} order - The raw order object.
 * @param {string} [originPincode="201303"] - Origin pincode (default provided).
 * @returns {Object} Shipment object matching the required structure.
 */
function convertOrderToShipment2(order, originPincode = "") {
    // Helper: clean currency string (e.g., "₹75.52" -> 75.52)
    const parseAmount = (amountStr) => {
        if (typeof amountStr !== 'string') return 0;
        const numeric = amountStr.replace(/[^0-9.-]/g, '');
        return parseFloat(numeric) || 0;
    };

    // ---- deliveryPincode ----
    const deliveryPincode = order.pincode || "";

    // ---- paymentMode ----
    // "paid" -> PREPAID, anything else (pending, etc.) -> COD
    const paymentMode = (order.financialStatus === "paid") ? "PREPAID" : "COD";

    // ---- weight ----
    let weight = 0;
    if (order.totalWeight && order.totalWeight > 0) {
        weight = parseFloat(order.totalWeight);
    } else if (order.items && order.items.length) {
        weight = order.items.reduce((sum, item) => sum + (item.deadWeight || 0), 0);
    }
    // fallback to 0.1 kg if still 0 (to avoid zero-weight issues)
    if (weight <= 0) weight = 0.1;

    // ---- invoiceValue ----
    let invoiceValue = 0;
    // Try subtotalPrice + totalTax (if available)
    if (order.subtotalPrice !== undefined && order.totalTax !== undefined) {
        const subtotal = parseFloat(order.subtotalPrice) || 0;
        const tax = parseFloat(order.totalTax) || 0;
        invoiceValue = subtotal + tax;
    }
    // Fallback: parse the "amount" field
    if (invoiceValue === 0 && order.amount) {
        invoiceValue = parseAmount(order.amount);
    }
    // Final fallback: sum item totalPrice
    if (invoiceValue === 0 && order.items && order.items.length) {
        invoiceValue = order.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    }

    // ---- dimensions ----
    // Default dimensions (as per example)
    let dimensions = { length: 12, width: 12, height: 10 };
    if (order.items && order.items.length) {
        let maxLen = 0, maxWid = 0, maxHei = 0;
        let hasDim = false;
        for (const item of order.items) {
            if (item.length > 0) { maxLen = Math.max(maxLen, item.length); hasDim = true; }
            if (item.width > 0)  { maxWid = Math.max(maxWid, item.width); hasDim = true; }
            if (item.height > 0) { maxHei = Math.max(maxHei, item.height); hasDim = true; }
        }
        if (hasDim) {
            dimensions = {
                length: maxLen || 10,
                width: maxWid || 10,
                height: maxHei || 10
            };
        }
    }

    // ---- return final object ----
    return {
        shipmentType: "FORWARD",
        packageType: "SPS",
        originPincode: originPincode,
        deliveryPincode: deliveryPincode,
        paymentMode: paymentMode,
        weight: weight,          // in kg
        invoiceValue: invoiceValue,
        dimensions: dimensions,
        serviceType: "domestic"
    };
}




















 const userdata=async ()=>{
      try {
  
  
        const response = await fetch(`${API_BASE_URL}/users/${getuser().id}`,{
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
          }
        });
        const data = await response.json();
        setrawData(data?.data?.ratechart ||[])
      } catch (error) {
        console.error("Error fetching wallet data:", error);
        return null;
      }
    } 
    useEffect(()=>{
         userdata()
    },[])
  

// const calculateVolumetricWeight = (height?: number, width?: number, length?: number): number | undefined => {
//     if (!height || !width || !length) return undefined;
//     return Number(((height * width * length) / 5000).toFixed(2));
//   }




// // Example
// getPincodeDetails("515871").then((res) => {
//   console.log(res);
// });

  const handleCalculate=async(orderdata,wareid='')=>{


    try {
     let pincodefrom=warehouselist.find((ware)=>ware.id==wareid || (wareid=="" && orderdata.warehouse) || (wareid=="" && ware.isDefault)) ||{}
    // let pincodefrom=warehouselist.find((ware)=>ware.id== orderdata.warehouse) ||{}
    console.log(pincodefrom,"pincodefrompincodefrompincodefrompincodefrompincodefrompincodefrom")





     console.log(pincodefrom)

    let hwl={
      height:0,
      width:0,
      length:0,
    }
    let tmpweight=0
    let valometric=0

    orderdata.items.map((val)=>{
         hwl.height +=val.height?val.height:10
         hwl.width +=val.width?val.width:10
         hwl.length +=val.length?val.length:10
         valometric +=calculateVolumetricWeight(val.height,val.width,val.length)

        tmpweight+=parseFloat(val.deadWeight) || 0

    })
    // order.items.map(item => item.deadWeight || 0).reduce((a, b) => a + b, 0)
    


 
      let pin1 =  {}
      let pin2 ={}

  //         for(let x of pincodelist.Sheet1){
  //           if(x.Pincode.includes(pincodefrom)){
  //             pin1=x
  //           }
  //           if(x.Pincode.includes(pincodeto)){
  //             pin2=x
  //           }
  //         }


       



  //       if(!pin1.City){
  //         pin1=await getPincodeDetails(pincodefrom)
  //       }

  // if(!pin2.City){
  //         pin2=await getPincodeDetails(pincodeto)
  //       }

  // console.log(pincodefrom?.city?.toLowerCase(),"gautam buddha nagar")

    let zone=""
      let response1={
        city: pincodefrom?.city?.toLowerCase()=="gautam buddha nagar"?"noida" :pincodefrom?.state?.toLowerCase()=="delhi"?"delhi":pincodefrom?.city?.trim()?.toLowerCase()||"",
        district:pincodefrom?.city?.toLowerCase()=="gautam buddha nagar"?"noida" :pincodefrom?.state?.toLowerCase()=="delhi"?"delhi":pincodefrom?.city?.trim()?.toLowerCase()||"" ,
        state:pincodefrom?.state?.trim()?.toLowerCase()||""  ,
      }

      
       let response2={ 
        city:orderdata?.city?.toLowerCase()=="gautam buddha nagar"?"noida" :orderdata?.state?.toLowerCase()=="delhi"?"delhi":orderdata.city?.trim()?.toLowerCase()||"",
        district:orderdata?.city?.toLowerCase()=="gautam buddha nagar"?"noida" :orderdata?.state?.toLowerCase()=="delhi"?"delhi":orderdata.city?.trim()?.toLowerCase()||"",
        state:orderdata.state?.trim()?.toLowerCase()||"",
      }

  // console.log(response1,response2,pincodefrom,"pincodefrompincodefrompincodefrompincodefrompincodefrompincodefrom",)



      let response3=await fetch(`${UPLOAD_BASE_URL}/read-excel`,{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body:JSON.stringify({pin1:response1,pin2:response2})
      })
      response3=await response3.json()


       zone=response3.data



      //  console.log(zone,"SADSADSADSADSADSADSAD")


      //     console.log(response1,response2,pin1,pin2,response3,"pin1pin1pin1pin1pin1pin1pin1pin1pin1pin1")

      if(response3.data=="Zone not found" || !response3.data){
      if(response1.city==response2.city && response1.state==response2.state){
        zone="ZONE A"
      }
      else if(response1.state==response2.state){
        zone="ZONE B"
      }
      else if((metroCities.includes(response1.city) && metroCities.includes(response2.city)) ||(metroPincodeList.includes(pincodefrom?.Pincode) && metroPincodeList.includes(orderdata.pincode))){ 
        zone="ZONE C"
        
      }
      else if(northEastStates.includes(response1.state) || northEastStates.includes(response2.state)){
        zone="ZONE E"
        
      }
      else{
        zone="ZONE D"
        
      }
    }
    




//  const response = await fetch("/zonetest.xlsx");


  // const arrayBuffer = await response.arrayBuffer();

  //  const workbook = XLSX.read(arrayBuffer, {
  //   type: "array",
  //   sheetRows: 5000, // IMPORTANT
  // });

  // const sheetName = workbook.SheetNames[0];

  // const worksheet = workbook.Sheets[sheetName];


  // const data____ = XLSX.utils.sheet_to_json(worksheet);

  // console.log(worksheet,data____);
// const response = await fetch('http://localhost:8080/zone.xlsx');
//   const buffer = await response.arrayBuffer();
//   const workbook = XLSX.read(buffer, { type: 'array' });
//   const sheet = workbook.Sheets[workbook.SheetNames[0]];
//   const data_____ = XLSX.utils.sheet_to_json(sheet);
//   console.log(data_____,"data_____data_____data_____data_____")



      
      let wieght=valometric>tmpweight?valometric:tmpweight //calculateVolumetricWeight(hwl.height,hwl.width,hwl.length)
      // console.log(wieght,"wieghtsakdlkdslalsdkladsk",valometric>tmpweight?valometric:tmpweight)
     
      let couriertype={

      }
    let alldata={
        type:[],
        rate:[],
        data:[],
      }
      let tmp=""
      const response___ = await fetch(`${API_BASE_URL}/users/${pincodefrom.user_id}`,{
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
          }
        });

        const data = await response___.json();

        
        // setrawData(data?.data?.ratechart ||[])
        rawData=data?.data?.ratechart ||[]
        let rawData_=rawData.slice(2)
       
        let alltype=[]

         for(let i=0;i<rawData_.length;i++)
            {
                  if(rawData_[i][0]!=null ){
                    if(!alltype.includes(rawData_[i][0])){
                      alltype.push(rawData_[i][0])
                    }
                  }
            }

            tmpzone=zone

          // console.log(wieght,zone,"dataaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",alltype)
    // console.log(pincodefrom,"pincodefrompincodefrom")


            for(let i=0;i<alltype.length;i++){
              if((zone=="ZONE A" || zone=="ZONE B") && alltype[i]?.includes("Air")){
                  continue;
                }
              let max=0
              let ind=-1


               let max2=0
              let ind2=-1
                for(let j=0;j<rawData_.length;j++)
                 { 
                    
                    let tmax=Number(rawData_[j][1].replaceAll(" ","").replace("Per","").replace("kg","").replace("additional","") || 0)
                    
                     if(rawData_[j][0]==alltype[i] && wieght<=tmax && ind2==-1){
                       ind2=j
                       max2=tmax 
                      
                    }
                    // console.log(tmax>max,rawData_[j][0]==alltype[i],wieght>=tmax)
                     if((tmax>max && rawData_[j][0]==alltype[i] && wieght>=tmax) ){
                      ind=j
                      max=tmax
                    }
                     
                    
                 }


                //  console.log(max,wieght,alltype[i],ind,">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>",ind2,max2)

                 if(ind==-1){
                  ind=ind2
                  max=max2
                 }


                    if(max>=wieght){ 
                      
      //                  charge +=data22.ratelist[tmpod.orderNumber].rate[data22.coureir[x]]

      //   // console.log(charge,"aslklksa asldkdlk saldkl",tmpod?.financialStatus, "pending")
 
      // if(tmpod.financialStatus == "pending"){
      //     // charge +=amountNum      
      //     let tmpcharg1=0   
      //     let tmpcharg2=0  
      //     try{
      //     let x11=data22.ratelist[tmpod.orderNumber].data[data22.coureir[x]].at(-1).replaceAll(" ","").replaceAll("%","").split("|")
      //     tmpcharg1=amountNum/100*parseFloat(x11[1])
      //     tmpcharg2=parseFloat(x11[0]) 

      //      charge +=tmpcharg1>tmpcharg2?tmpcharg1:tmpcharg2
      //       // console.log("mmmmmmmmmmmm",charge,amountNum,tmpcharg1,tmpcharg2)  
          
             
      //     }
      //     catch(e){
      //       console.log(e,"ratelistttttttttt",tmpcharg1,amountNum)

      //     }
      //   }
      //   charge=charge*1.18



       let amountNum = parseFloat(orderdata.amount.replace(/[^0-9.-]/g, ''));
  let charge=0
              
 
              

            
        charge +=rawData_[ind][rawData[0].indexOf(zone)]

     
 
      if(orderdata.financialStatus == "pending"){
          // charge +=amountNum      
          let tmpcharg1=0   
          let tmpcharg2=0  
          try{
          let x11= rawData_[ind].at(-1).replaceAll(" ","").replaceAll("%","").split("|")
          tmpcharg1=amountNum/100*parseFloat(x11[1])
          tmpcharg2=parseFloat(x11[0]) 

           charge +=tmpcharg1>tmpcharg2?tmpcharg1:tmpcharg2
            console.log("mmmmmmmmmmmm",charge,amountNum,tmpcharg1,tmpcharg2 , orderdata.courier==alltype[i])  
            orderdata.courier==alltype[i] &&   rtocharge.push({orderNumber:orderdata.orderNumber,charge:tmpcharg1>tmpcharg2?tmpcharg1:tmpcharg2,totalrate:rawData_[ind][rawData[0].indexOf(zone)]})
          
             
          }
          catch(e){
            console.log(e,"ratelistttttttttt",tmpcharg1,amountNum)

          }
        }
        else{
            orderdata.courier==alltype[i] &&   rtocharge.push({orderNumber:orderdata.orderNumber,charge:0,totalrate:rawData_[ind][rawData[0].indexOf(zone)]})

        }
        charge=charge*1.18


                      



                        alldata.type.push(alltype[i])
                        alldata.rate.push(charge.toFixed(2))
                        alldata.data.push(rawData_[ind]) 
                        
                      }
                      else{
   
                        // console.log(rawData_,max,wieght,">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>",ind)

                   let amount1=Number(rawData_[ind][rawData[0].indexOf(zone)])
                    let amount2=Number(rawData_[ind+1][rawData[0].indexOf(zone)])
                    let totalrate=amount1+amount2 
                    max+=Number(rawData_[ind+1][1].replaceAll(" ","").replace("Per","").replace("kg","").replace("additional","") || 0) 
                    do{

                        if( max>=wieght){
                        alldata.type.push(alltype[i])


  let amountNum = parseFloat(orderdata.amount.replace(/[^0-9.-]/g, ''));
  let charge=0
              
 
              

            
        charge +=totalrate

     
 
      if(orderdata.financialStatus == "pending"){
          // charge +=amountNum      
          let tmpcharg1=0   
          let tmpcharg2=0  
          try{
          let x11= rawData_[ind].at(-1).replaceAll(" ","").replaceAll("%","").split("|")
          tmpcharg1=amountNum/100*parseFloat(x11[1])
          tmpcharg2=parseFloat(x11[0]) 

           charge +=tmpcharg1>tmpcharg2?tmpcharg1:tmpcharg2



       orderdata.courier==alltype[i] &&   rtocharge.push({orderNumber:orderdata.orderNumber,charge:tmpcharg1>tmpcharg2?tmpcharg1:tmpcharg2,totalrate:totalrate})
            //  console.log("mmmmmmmmmmmm",orderdata.courier,alltype[i])  
          
             
          }
          catch(e){
            console.log(e,"ratelistttttttttt",tmpcharg1,amountNum)

          }
        }
        else{
          orderdata.courier==alltype[i] && rtocharge.push({orderNumber:orderdata.orderNumber,charge:0,totalrate:totalrate})

        }
        charge=charge*1.18




                        alldata.rate.push(charge.toFixed(2))
                        alldata.data.push(rawData_[ind]) 
                       
                        break;
                      }
                      max+=Number(rawData_[ind+1][1].replaceAll(" ","").replace("Per","").replace("kg","").replace("additional","") || 0)
                      totalrate+=amount2 
                      }while(1);
                      }
                  }

                  
            




//           for(let i=0;i<rawData_.length;i++)
//             {
//             if((zone=="ZONE A" || zone=="ZONE B") && rawData[i][0]?.includes("Air")){

//             }
//             else
//               {
//              if(rawData_[i][0]!=null || rawData_.length-1==i){ 
                   
//                if((tmp!="" && tmp!=rawData_[i][0]) || (rawData_.length-1==i))
//                 {
//                     let tmpind=rawData_.length-1==i?i:i-1
//                     if(tmp.includes("Air") && (zone=="ZONE A" || zone=="ZONE B")){
//                     }
//                       else{
                    



// // console.log(rawData_,rawData_[tmpind][rawData[0].indexOf(zone)],zone,tmpind,"rawData_[tmpind][rawData[0].indexOf(zone)]",tmpind,rawData_.length-1==i,"tmpind,rawData_.length-1==i")
//                     let amount1=Number(rawData_[tmpind][rawData[0].indexOf(zone)])
//                     let amount2=Number(rawData_[tmpind-1][rawData[0].indexOf(zone)])
//                     let tmmfin=amount1+amount2 
                        
//                 while(1){
//                couriertype[tmp].total +=Number(rawData_[tmpind][1].replaceAll(" ","").replace("Per","").replace("kg","").replace("additional","") || 0)
//                tmmfin +=amount1
//             //  console.log(couriertype[tmp].total,wieght,tmmfin,tmp,amount1,"couriertype[tmp].total,wieght")


//               if(couriertype[tmp].total>=wieght){
//               //  console.log(couriertype[tmp].total,"couriertype[tmp].total")

//                   if(!alldata.type.includes(tmp)){  
//                         alldata.type.push(tmp)
//                         alldata.rate.push(tmmfin)
//                         alldata.data.push(rawData_[tmpind-1])  
//                   }
//                   console.log(couriertype[tmp],"couriertype[tmp]",tmpind)
//                   break; 
//              }




//                 }
//                 if(rawData_.length-1==i){
//                   break;
//                 }
//               }
                        
                

//                }
                  
//               //  for(let j=0;j<rawData_.length;j++){
//               //    if(rawData_[j][0]!=null){

//               //    }

//               //  }



//               tmp=rawData_[i][0]
//               couriertype[tmp]={total:0}     
//               couriertype[tmp].total +=Number(rawData_[i][1].replaceAll(" ","").replace("Per","").replace("kg","").replace("additional","")||0)
//              }
//              else
//               {
//                couriertype[tmp].total +=Number(rawData_[i][1].replaceAll(" ","").replace("Per","").replace("kg","").replace("additional","") || 0)
//              }

                    
             

//             //  console.log(couriertype[tmp].total,wieght,tmp,"couriertype[tmp].total,wieght")




//              if(couriertype[tmp].total>=wieght){
//                   if(!alldata.type.includes(tmp)){
//                         alldata.type.push(tmp)
//                         alldata.rate.push(rawData_[i][0]!=null?rawData_[i][rawData[0].indexOf(zone)]:(rawData_[i-1][rawData[0].indexOf(zone)]+rawData_[i][rawData[0].indexOf(zone)]))
//                         alldata.data.push(rawData_[i]) 
//                   }
//              }
            

//             }



             

//             //  console.log(couriertype)
      
//           }

          //  console.log(alldata,"askjdkajsnasdkjaksd askdjkads ",zone)


         ratelist[orderdata.orderNumber]=JSON.parse(JSON.stringify(alldata))||{}  






         return alldata

        }
        catch(e){
           console.log(e,"sakjdksajdk sakdjsadkjk sadksajdk")
        }


  }





async function getrtocharge(){
  let rtood=[]
  
  for(let x of sortedOrders){
    if(x.status.toLowerCase().includes("rto")){
      rtood.push(x.orderNumber)

       await handleCalculate(x)
    }
  }
  let rtood2=[]

     for(let x of rtocharge){
      
      rtood2.push(x.orderNumber)
     }
  

  for(let x of rtood){
    if(!rtood2.includes(x)){
    // console.log(x,"xorderNumberxorderNumberxorderNumber")
    }
  }

  console.log(rtocharge,"rtochargertochargertocharge")
}
// setTimeout(()=>{  






// },20000)

 

const funsettype=(y,response2)=>{
   let rrr=response2.rate[0]||0
        bulkshipmentcreate.coureir[y]=0
        for(let y1  in response2?.rate){
          if(response2?.rate[y1]<rrr){
            rrr=response2?.rate[y1]
            bulkshipmentcreate.coureir[y]=Number(y1)
          }              
        }
}



  let fungetratelist=async()=>{
    try{
    const response = await fetch(`${API_BASE_URL}/users/${getuser().id}`,{
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        }
      });
      const data = await response.json();
      let pincode=data.data.pincode
    let pincodefrom=warehouselist.find((ware)=>ware.isDefault) || {}

     for(let y in bulkshipmentcreate.orderlist){
      let x=bulkshipmentcreate.orderlist[y]

        let response2=await  handleCalculate(x,pincodefrom.id)
        bulkshipmentcreate.warehouselist[y]=pincodefrom.id
        bulkshipmentcreate.zone[y]=tmpzone
        


        funsettype(y,response2)
    
         
     
     }
     setbulkshipmentcreate({...bulkshipmentcreate})
     setratelist({...ratelist})
    }
    catch(e){
      console.log(e,">>>>>>>>>>>>>>>>>>>")
    }
  }

  
const uploaddcoument=async(e)=>{
  let formdata=new FormData()
  formdata.append("file",e.target.files[0])

let response=await fetch(`${UPLOAD_BASE_URL}/upload`,{
  method:"POST",
  body:formdata
})
response=await response.json()
setproof(response?.fileInfo?.filename || "")
e.target.value=""
}


const checkmerge=()=>{
 if(bulkshipmentcreate.orderlist.length<2){
  return false
 }
 let match=true
 let statusx=bulkshipmentcreate.orderlist[0].status
 let customerdetails={
  name:bulkshipmentcreate.orderlist[0].customerName?.toLowerCase(),
  phone:bulkshipmentcreate.orderlist[0].customerPhone,
  pincode:bulkshipmentcreate.orderlist[0].pincode,
  financialStatus:bulkshipmentcreate.orderlist[0].financialStatus,
  address:bulkshipmentcreate.orderlist[0].addressLine1?.replace(/[^\p{L}\p{N} ]/gu, '')?.toLowerCase()?.split(" ") || null,
 }
 const checkaddress=(add1,add2)=>{
  add2=add2?.replace(/[^\p{L}\p{N} ]/gu, '').toLowerCase()?.split(" ") || null
  if(!add1 || !add2){
    return true
  }
  if(add1.length==0 || add2.length==0){
    return true
  }
  let match=false
  let arrrr=(add1.length>=add2.length?add1:add2)
  for(let x of (add1.length<=add2.length?add1:add2)){
    if(!arrrr.includes(x)){
      match=true
      break
    }

  }
 }
for(let x of bulkshipmentcreate.orderlist){
if(statusx!=x.status || customerdetails.name!=x.customerName.toLowerCase() || customerdetails.phone!=x.customerPhone || customerdetails.pincode!=x.pincode || customerdetails.financialStatus!=x.financialStatus || checkaddress(customerdetails.address,x.addressLine1)){
  match=false
  break
}
}
return match
}


function mergeOrders(orders) {
  if (!orders || orders.length === 0) return null;
  if (orders.length === 1) return { ...orders[0] };

  // Helper: parse amount string like "₹297.36" → number
  const parseAmount = (amountStr) => {
    const match = amountStr?.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  };

  // Helper: format number back to INR currency string
  const formatAmount = (num) => `₹${num.toFixed(2)}`;

  // Start with a shallow copy of the first order as base
  const base = orders[0];
  const merged = {
    ...base,
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    items: [...(base.items || [])],
    totalItems: base.totalItems || 0,
    totalWeight: base.totalWeight || 0,
    totalVolumetricWeight: base.totalVolumetricWeight || 0,
    subtotalPrice: parseFloat(base.subtotalPrice) || 0,
    totalTax: parseFloat(base.totalTax) || 0,
    totalDiscounts: parseFloat(base.totalDiscounts) || 0,
    totalShippingPrice: parseFloat(base.totalShippingPrice) || 0,
    totalOutstanding: parseFloat(base.totalOutstanding) || 0,
    amountNumber: parseAmount(base.amount),
    merge_order:[orders[0].orderNumber]
  };

  // Merge subsequent orders
  for (let i = 1; i < orders.length; i++) {
    const order = orders[i];

    // Merge items
    if (order.items?.length) {
      merged.items.push(...order.items);
    }

    // Sum numeric fields
    merged.totalItems += order.totalItems || 0;
    merged.totalWeight += order.totalWeight || 0;
    merged.totalVolumetricWeight += order.totalVolumetricWeight || 0;
    merged.subtotalPrice += parseFloat(order.subtotalPrice) || 0;
    merged.totalTax += parseFloat(order.totalTax) || 0;
    merged.totalDiscounts += parseFloat(order.totalDiscounts) || 0;
    merged.totalShippingPrice += parseFloat(order.totalShippingPrice) || 0;
    merged.totalOutstanding += parseFloat(order.totalOutstanding) || 0;
    merged.amountNumber += parseAmount(order.amount);
    merged.merge_order.push(order.orderNumber)
  }



  // Format the summed amount back to currency string
  merged.amount = formatAmount(merged.amountNumber);
  delete merged.amountNumber;

  // Convert summed numeric fields back to strings if they were originally strings
  merged.subtotalPrice = merged.subtotalPrice.toFixed(2);
  merged.totalTax = merged.totalTax.toFixed(2);
  merged.totalDiscounts = merged.totalDiscounts.toFixed(2);
  merged.totalShippingPrice = merged.totalShippingPrice.toFixed(2);
  merged.totalOutstanding = merged.totalOutstanding.toFixed(2);

  // Handle fields that may conflict
  merged.orderNumber = orders.map(o => o.orderNumber).filter(Boolean).join(',').replaceAll(",","");
  merged.orderDate = orders.reduce((earliest, o) => 
    o.orderDate && o.orderDate < earliest ? o.orderDate : earliest, orders[0].orderDate);
  merged.status = orders.some(o => o.status === 'Pending') ? 'Pending' : (orders[0].status || 'Merged');
  merged.courier = orders.every(o => o.courier === orders[0].courier) ? orders[0].courier : 'Multiple';
  merged.awb = orders.every(o => o.awb === orders[0].awb) ? orders[0].awb : null;
  merged.trackingnumber = null; // reset when merging
  merged.merge_status="Merged"
  merged.platform="Merged"

  return merged;
}

 const handleCreateMerge = async () => {
try{
  let orderdata=mergeOrders(bulkshipmentcreate.orderlist)
    
      const newOrder = await orderApi.mergecreate([orderdata]);
    fetchOrders()
      toast({ title: "Success", description: "Order Merged successfully" });
    } catch (error) {
      console.log(error,"sadmansdmansd samdnamdsnm")

      toast({
        title: "Error",
        description: "Failed to create order",
        variant: "destructive",
      });
    }

setbulkshipmentcreate({coureir:[],orderlist:[],id:[],ratelist:{},warehouselist:[],dispatchdate:{},zone:[]})

  };


  const exceldatetorealdate = (excelDate) => {
  try{
    const [day, month, year] = excelDate.split('/');

  const d = String(day).padStart(2, '0');
  const m = String(month).padStart(2, '0');

  return `${year}-${m}-${d}`;
  }
  catch(e){
    try{
      const date = new Date((excelDate - 25569) * 86400 * 1000);

    return date.toISOString().split('T')[0].split("-")[0]+"-"+date.toISOString().split('T')[0].split("-")[2]+"-"+date.toISOString().split('T')[0].split("-")[1];

    }
    catch(e){
      alert("Invalid date format in Excel. Please ensure dates are in 'DD/MM/YYYY' format or valid Excel date numbers.")

    }
}
  }

//   const exceldatetorealdate=(excelDate)=>{

// const date = new Date((excelDate - 25569) * 86400 * 1000);

// return date.toISOString().split('T')[0].split("-")[0]+"-"+date.toISOString().split('T')[0].split("-")[2]+"-"+date.toISOString().split('T')[0].split("-")[1];
//   }
  // Parse Excel/CSV file and convert rows to orders
const parseExcelToOrders = async (file: File): Promise<{ orders: any[], errors: string[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet);
      
      if (!rows.length) {
        resolve({ orders: [], errors: ['File is empty'] });
        return;
      }

      const errors: string[] = [];
      const orderMap = new Map<string, any>();

      // Required columns
      const requiredCols = ['Order Number','Order Date', 'Customer Name', 'Customer Phone', 'Pincode', 'City', 'State', 'Address Line 1', 'Product Name', 'Quantity', 'Unit Price'];
      const firstRow = rows[0];
      const missingCols = requiredCols.filter(col => !(col in firstRow));
      if (missingCols.length) {
        errors.push(`Missing required columns: ${missingCols.join(', ')}`);
        resolve({ orders: [], errors });
        return;
      }

      for (let idx = 0; idx < rows.length; idx++) {
        const row = rows[idx];
        const orderNumber = row['Order Number']?.toString().trim();
        if (!orderNumber) {
          errors.push(`Row ${idx + 2}: Order Number is required`);
          continue;
        }

        // Validate numeric fields
        const quantity = parseFloat(row['Quantity']);
        const unitPrice = parseFloat(row['Unit Price']);
        const gstRate = parseFloat(row['GST Rate (%)'] || 18);
        const height = row['Height (cm)'] ? parseFloat(row['Height (cm)']) : undefined;
        const width = row['Width (cm)'] ? parseFloat(row['Width (cm)']) : undefined;
        const length = row['Length (cm)'] ? parseFloat(row['Length (cm)']) : undefined;
        const deadWeight = row['Dead Weight (kg)'] ? parseFloat(row['Dead Weight (kg)']) : undefined;

        if (isNaN(quantity) || quantity <= 0) {
          errors.push(`Row ${idx + 2}: Quantity must be a positive number`);
          continue;
        }
        if (isNaN(unitPrice) || unitPrice < 0) {
          errors.push(`Row ${idx + 2}: Unit Price must be a valid number`);
          continue;
        }

        const item = {
          name: row['Product Name']?.toString().trim() || 'Unnamed Product',
          unitPrice,
          quantity,
          gstRate: isNaN(gstRate) ? 18 : gstRate,
          height,
          width,
          length,
          deadWeight,
        };

        if (!orderMap.has(orderNumber)) {
          // Create new order object
          const newOrder = {
            orderNumber,
            
            customerName: row['Customer Name']?.toString().trim() || '',
            customerPhone: row['Customer Phone']?.toString().trim() || '',
            customerEmail: row['Customer Email']?.toString().trim() || '',
            seller: getuser()?.role === "admin" ? (row['Seller ID'] || getuser()?.id) : getuser()?.id,
            courier: row['Courier'] || '-',
            status: 'Pending' as OrderStatus,
            amount: '0',
            orderDate: exceldatetorealdate(row['Order Date']),
            processedAt: exceldatetorealdate(row['Order Date']),

            awb: '-',
            platform: (row['Platform'] as Platform) || 'Manual',
            pincode: row['Pincode']?.toString().trim() || '',
            city: row['City']?.toString().trim() || '',
            state: row['State']?.toString().trim() || '',
            addressLine1: row['Address Line 1']?.toString().trim() || '',
            addressLine2: row['Address Line 2']?.toString().trim() || '',
            landmark: row['Landmark']?.toString().trim() || '',
            paymentGateway: row['Payment Method'] === 'Prepaid' ? 'Prepaid' : 'COD',
            items: [],
            user_id: getuser()?.role === "admin" ? (row['Seller ID'] || getuser()?.id) : getuser()?.id,
            totalItems: 0,
            totalWeight: undefined,
            totalVolumetricWeight: undefined,
            financialStatus: row['Payment Method'] === 'Prepaid' ? 'paid' : 'pending',
            fulfillmentStatus: null,
            subtotalPrice: null,
            totalTax: 0,
            totalDiscounts: 0,
            totalShippingPrice: 0,
            totalOutstanding: 0,
            currency: 'INR',
            taxesIncluded: false,
            taxExempt: false,
            confirmationNumber: null,
            checkoutId: null,
            checkoutToken: null,
            orderStatusUrl: null,
            sourceName: null,
            browserIp: null,
            userAgent: null,
            shippingAddress: null,
            billingAddress: null,
            customerData: null,
            cancelledAt: null,
            cancelReason: null,
            trackingnumber: null,
          };
          orderMap.set(orderNumber, newOrder);
        }

        const order = orderMap.get(orderNumber);
        order.items.push(item);
      }

      // Calculate totals for each order
      const orders = Array.from(orderMap.values()).map(order => {
        let totalAmount = 0;
        let totalItems = 0;
        let totalWeight = 0;
        let totalVolumetricWeight = 0;
        let subtotal = 0;
        let totalTax = 0;

        order.items.forEach((item: any) => {
          const itemTotal = item.unitPrice * item.quantity;
          const gstAmount = (itemTotal * item.gstRate) / 100;
          const finalTotal = itemTotal + gstAmount;
          totalAmount += finalTotal;
          totalItems += item.quantity;
          totalWeight += (item.deadWeight || 0) * item.quantity;
          
          const volWeight = calculateVolumetricWeight(item.height, item.width, item.length);
          if (volWeight) totalVolumetricWeight += volWeight * item.quantity;
          
          subtotal += itemTotal;
          totalTax += gstAmount;
        });

        order.amount = `₹${totalAmount.toFixed(2)}`;
        order.totalItems = totalItems;
        order.totalWeight = totalWeight;
        order.totalVolumetricWeight = totalVolumetricWeight;
        order.subtotalPrice = subtotal.toFixed(2);
        order.totalTax = totalTax.toFixed(2);
        order.items = order.items.map((item: any) => ({
          ...item,
          volumetricWeight: calculateVolumetricWeight(item.height, item.width, item.length),
          totalPrice: item.unitPrice * item.quantity + (item.unitPrice * item.quantity * item.gstRate) / 100
        }));

        return order;
      });

      resolve({ orders, errors });
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
};

// Handle file upload and preview
const handleUploadFile = async (file: File) => {
  setUploadFile(file);
  setUploadErrors([]);
  setUploadProcessing(true);
  try {
    const { orders, errors } = await parseExcelToOrders(file);
    // console.log(orders,"ordersordersordersorders")



    if (errors.length) {
      setUploadErrors(errors);
      setUploadPreview([]);
    } else {
      setUploadPreview(orders);
      setUploadErrors([]);
    }
  } catch (err: any) {
    setUploadErrors([err.message || 'Failed to parse file']);
    setUploadPreview([]);
  } finally {
    setUploadProcessing(false);
  }
};

// Confirm and create orders
const handleUploadConfirm = async () => {
  if (!uploadPreview.length) return;
  setUploadProcessing(true);
  try {
    await orderApi.mancreate(uploadPreview);
    toast({ title: "Success", description: `${uploadPreview.length} orders created successfully` });
    fetchOrders(); // refresh list
    setUploadDialogOpen(false);
    setUploadFile(null);
    setUploadPreview([]);
    setUploadErrors([]);
  } catch (error: any) {
    toast({
      title: "Error",
      description: error.message || "Failed to create orders",
      variant: "destructive",
    });
  } finally {
    setUploadProcessing(false);
  }
};

// console.log(bulkshipmentcreate,"bulkshipmentcreatebulkshipmentcreatebulkshipmentcreate")

// Download Excel template for bulk upload
const handleDownloadTemplate = () => {
  // Define headers and sample rows
  const headers = [
    "Order Number",
    "Order Date",
    "Customer Name",
    "Customer Phone",
    "Customer Email",
    "Pincode",
    "City",
    "State",
    "Address Line 1",
    "Address Line 2",
    "Landmark",
    "Product Name",
    "Quantity",
    "Unit Price",
    "GST Rate (%)",
    "Height (cm)",
    "Width (cm)",
    "Length (cm)",
    "Dead Weight (kg)",
    "Payment Method",
    "Courier",
    "Platform"
  ];

  // Sample data rows (can be removed by user)


  let datetmp=new Date()

  datetmp.setDate(datetmp.getDate()+2)
  const sampleRows = [
    [
      "ORD-001", 
      "5/5/2025",
      "John Doe",
      "9876543210",
      "john@example.com",
      "400001",
      "Mumbai",
      "Maharashtra",
      "123, Main Street",
      "Near Park",
      "Landmark",
      "Wireless Mouse",
      "2",
      "499",
      "18",
      "3",
      "8",
      "12",
      "0.2",
      "COD",
      "eKART",
      "Manual"
    ]
  ];

  // Create worksheet
  const wsData = [headers, ...sampleRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths for better readability
  ws['!cols'] = [
    { wch: 15 }, // Order Number
    { wch: 20 }, // Customer Name
    { wch: 15 }, // Customer Phone
    { wch: 25 }, // Customer Email
    { wch: 10 }, // Pincode
    { wch: 15 }, // City
    { wch: 15 }, // State
    { wch: 30 }, // Address Line 1
    { wch: 25 }, // Address Line 2
    { wch: 15 }, // Landmark
    { wch: 25 }, // Product Name
    { wch: 10 }, // Quantity
    { wch: 12 }, // Unit Price
    { wch: 12 }, // GST Rate (%)
    { wch: 12 }, // Height (cm)
    { wch: 12 }, // Width (cm)
    { wch: 12 }, // Length (cm)
    { wch: 15 }, // Dead Weight (kg)
    { wch: 15 }, // Payment Method
    { wch: 12 }, // Courier
    { wch: 12 }, // Platform
    { wch: 20 }  // Seller ID
  ];

  // Add some styling (optional - makes headers bold)
  for (let i = 0; i < headers.length; i++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: i });
    if (!ws[cellAddress]) ws[cellAddress] = {};
    ws[cellAddress].s = { font: { bold: true, sz: 12 } };
  }

  // Create workbook and trigger download
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Order Template");
  XLSX.writeFile(wb, "order_upload_template.xlsx");
};


const getdefaultdata= async (warehouseid,orderNumber) => {
  let response =await apiRequest("GET","auth/getAllWarehouses",{},{})
  // let response2 =await apiRequest("GET","wallets",{},{})


  // console.log(response,response2,"saklaskdlasmdnadsmnsadm")
let warehouse=response.data.data.find((val)=>val.id==warehouseid)

delete warehouse.seller



  // console.log(response,"asdjlsakdl ")

  //  return {warehouse:warehouse,amountcharge:response2.data.find((val)=>val.orderNumber==orderNumber)?.amount || 0}
   return {warehouse:warehouse}

}



async function generateAWBQRCode(awbNumber) {
  try {
    // Options: size, margin, error correction (adjust as needed)
    const qrDataUrl = await QRCode.toDataURL(awbNumber, {
      width: 150,          // width in pixels
      margin: 2,           // margin around QR
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrDataUrl;
  } catch (err) {
    console.error('QR generation failed:', err);
    return null;
  }
}
const imageUrlToBase64 = async (url) => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// const generateBarcodeDataURL = async (text, width = 1.8, height = 35) => {
//   if (!text || text === 'N/A' || text === '-') return null;
//   try {
//     const canvas = document.createElement('canvas');
//     JsBarcode(canvas, text, {
//       format: 'CODE128',
//       width: width,
//       height: height,
//       displayValue: true,      // show human‑readable text below bars
//       fontSize: 10,            // small to fit label
//       margin: 4,
//       background: '#ffffff',
//       lineColor: '#000000',
//     });
//     return canvas.toDataURL('image/png');
//   } catch (err) {
//     console.error('Barcode generation failed:', err);
//     return null;
//   }
// };

// ----- Helper: Format currency to Rs. with two decimals -----

const generateBarcodeDataURL = async (text, width = 2.5, height = 50) => {
  if (!text || text === 'N/A' || text === '-') return null;
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, text, {
      format: 'CODE128',
      width: width,           // Increased from 1.8 to 2.5
      height: height,         // Increased from 35 to 50
      displayValue: true,
      fontSize: 12,           // Increased from 10
      margin: 8,              // Increased from 4
      background: '#ffffff',
      lineColor: '#000000',
      textMargin: 4,          // Space between barcode and text
    });
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Barcode generation failed:', err);
    return null;
  }
};

// Also update the user 11 specific label function if needed:

async function buildShippingLabel11(order) {
  const defaultdata = await getdefaultdata(order.warehouse, order.orderNumber);

  // Generate barcodes with larger dimensions
  const awbBarcode = await generateBarcodeDataURL(order.awb, 2.5, 50);

  const paymentMethod = order.financialStatus === "pending" ? "COD" : "Prepaid";

  const shippingAddress = [
    order.customerName,
    order.addressLine1,
    order.addressLine2,
    order.landmark,
    `${order.city || ""}, ${order.state || ""}, India`,
    order.pincode,
    `Contact : ${order.customerPhone || "-"}`
  ].filter(Boolean).join("\n");

  const bookedDate = new Date(order.processedAt || new Date()).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const tableBody = [
    [
      { text: "SKU", bold: true, fontSize: 8, alignment: "center", fillColor: "#eef2ff", margin: [3, 5, 3, 5] },
      { text: "Name", bold: true, fontSize: 8, alignment: "center", fillColor: "#eef2ff", margin: [3, 5, 3, 5] },
      { text: "QTY", bold: true, fontSize: 8, alignment: "center", fillColor: "#eef2ff", margin: [3, 5, 3, 5] },
      { text: "HSN\nCode", bold: true, fontSize: 8, alignment: "center", fillColor: "#eef2ff", margin: [3, 5, 3, 5] },
      { text: "Tax", bold: true, fontSize: 8, alignment: "center", fillColor: "#eef2ff", margin: [3, 5, 3, 5] }
    ]
  ];

  order.items.forEach((item) => {
    tableBody.push([
      { text: item.sku || "-", fontSize: 7.5, margin: [3, 4, 3, 4] },
      { text: item.name || "-", fontSize: 7.5, margin: [3, 4, 3, 4] },
      { text: String(item.quantity || 1), alignment: "center", fontSize: 7.5, margin: [3, 4, 3, 4] },
      { text: item.hsn || "-", alignment: "center", fontSize: 7.5, margin: [3, 4, 3, 4] },
      { text: `${item.gstRate || 0}.00%`, alignment: "center", fontSize: 7.5, margin: [3, 4, 3, 4] }
    ]);
  });

  return [
    {
      // Larger label size for user 11
      pageSize: {
        width: 350,
        height: 520
      },

      pageMargins: [6, 6, 6, 6],

      defaultStyle: {
        fontSize: 8
      },

      table: {
        widths: ["*"],

        body: [
          [
            {
              columns: [
                {
                  width: "*",
                  stack: [
                    {
                      text: "SHIP TO",
                      bold: true,
                      fontSize: 11,
                      margin: [6, 5, 4, 2],
                      color: "#1e3a8a"
                    },
                    {
                      text: shippingAddress,
                      fontSize: 9,
                      lineHeight: 1.3,
                      margin: [6, 0, 4, 5]
                    }
                  ]
                },
                {
                  width: 150,
                  stack: [
                    {
                      text: order.courier || "Delhivery",
                      alignment: "center",
                      bold: true,
                      fontSize: 13,
                      margin: [5, 4, 4, 2],
                      color: "#1e3a8a"
                    }
                  ]
                }
              ]
            }
          ],

          [
            {
              columns: [
                {
                  width: "*",
                  stack: [
                    {
                      text: [{ text: "PAYMENT : ", bold: true, fontSize: 9 }, paymentMethod],
                      margin: [6, 4, 0, 2]
                    },
                    {
                      text: [{ text: "AWB No. : ", bold: true, fontSize: 9 }, order.awb || "-"],
                      margin: [6, 2, 0, 2]
                    }
                  ]
                },
                {
                  width: 150,
                  stack: [
                    {
                      text: order.courier || "Delhivery",
                      alignment: "center",
                      bold: true,
                      fontSize: 10,
                      margin: [0, 3, 0, 2]
                    },
                    awbBarcode
                      ? {
                          image: awbBarcode,
                          width: 140,
                          height: 55,
                          alignment: "center",
                          margin: [0, 5, 0, 5]
                        }
                      : {},
                    {
                      text: order.awb || "-",
                      alignment: "center",
                      bold: true,
                      fontSize: 10,
                      margin: [0, 3, 0, 4]
                    }
                  ]
                }
              ]
            }
          ],

          [
            {
              text: `Booked: ${bookedDate}`,
              fontSize: 8,
              margin: [6, 2, 4, 6],
              color: "#666"
            }
          ],

          [
            {
              table: {
                headerRows: 1,
                widths: [60, "*", 35, 50, 45],
                body: tableBody
              },
              layout: {
                hLineWidth: () => 0.8,
                vLineWidth: () => 0.8,
                hLineColor: () => "#000",
                vLineColor: () => "#000"
              }
            }
          ],

          [
            {
              text: "THIS IS AN AUTO-GENERATED LABEL AND DOES NOT REQUIRE SIGNATURE",
              alignment: "center",
              bold: true,
              fontSize: 7,
              margin: [6, 10, 6, 6],
              color: "#666"
            }
          ]
        ]
      },

      layout: {
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        hLineColor: () => "#000",
        vLineColor: () => "#000"
      },

      pageBreak: "after"
    }
  ];
}

const formatCurrency = (amount) => {
  const numeric = typeof amount === 'number'
    ? amount
    : parseFloat(String(amount).replace(/[^0-9.-]/g, ''));
  return isNaN(numeric) ? 'Rs. 0.00' : `Rs. ${numeric.toFixed(2)}`;
};



async function generateShippingLabel11(order) {
  const defaultdata = await getdefaultdata(
    order.warehouse,
    order.orderNumber
  );

  const warehouse = defaultdata?.warehouse || {};

  const awbBarcode = await generateBarcodeDataURL(order.awb);
  const orderBarcode = await generateBarcodeDataURL(order.orderNumber);

  const paymentMethod =
    order.financialStatus === "pending"
      ? "COD"
      : "Prepaid";

  const shippingAddress = [
    order.customerName,
    order.addressLine1,
    order.addressLine2,
    order.landmark,
    `${order.city || ""}, ${order.state || ""}, India`,
    order.pincode,
    `Contact : ${order.customerPhone || "-"}`
  ]
    .filter(Boolean)
    .join("\n");

  const bookedDate = new Date(
    order.processedAt || new Date()
  ).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const tableBody = [
    [
      {
        text: "SKU",
        bold: true,
        fontSize: 6,
        alignment: "center"
      },
      {
        text: "Name",
        bold: true,
        fontSize: 6,
        alignment: "center"
      },
      {
        text: "QTY",
        bold: true,
        fontSize: 6,
        alignment: "center"
      },
      {
        text: "HSN\nCode",
        bold: true,
        fontSize: 6,
        alignment: "center"
      },
      {
        text: "Tax",
        bold: true,
        fontSize: 6,
        alignment: "center"
      }
    ]
  ];

  order.items.forEach((item) => {
    tableBody.push([
      {
        text: item.sku || "-",
        fontSize: 5.5
      },
      {
        text: item.name || "-",
        fontSize: 5.5
      },
      {
        text: String(item.quantity || 1),
        alignment: "center",
        fontSize: 5.5
      },
      {
        text: item.hsn || "-",
        alignment: "center",
        fontSize: 5.5
      },
      {
        text: `${item.gstRate || 0}.00%`,
        alignment: "center",
        fontSize: 5.5
      }
    ]);
  });

  const docDefinition = {
    pageSize: {
      width: 288,
      height: 432
    },

    pageMargins: [1, 1, 1, 1],

    defaultStyle: {
      fontSize: 6.5
    },

    content: [
      {
        table: {
          widths: ["*"],

          body: [
            // SHIP TO
            [
              {
                columns: [
                  {
                    width: "*",

             
                stack: [
                  {
                    text: "Ship To",
                    bold: true,
                    fontSize: 8,
                    margin: [4, 3, 4, 1]
                  },

                  {
                    text: shippingAddress,
                    fontSize: 7,
                    lineHeight: 1,
                    margin: [4, 0, 4, 3]
                  }
                ],

               
            },
          
            {
                    width: 118,

                    stack: [
                      {
                        text: order.courier || "Delhivery",
                        alignment: "center",
                        bold: true,
                        fontSize: 12,
                        margin: [5, 2, 4, 1]
                      },


                     
                    ]
                  }
          
          ]}
              
            ],

            // PAYMENT + AWB
            [
              {
                columns: [
                  {
                    width: "*",

                    stack: [
                      {
                        text: [
                          {
                            text: "Payment : ",
                            bold: true
                          },
                          paymentMethod
                        ],

                        fontSize: 7,
                        margin: [4, 3, 0, 1]
                      },

                      {
                        text: [
                          {
                            text: "AWB No. : ",
                            bold: true
                          },
                          order.awb || "-"
                        ],

                        fontSize: 7,
                        margin: [4, 0, 0, 1]
                      }
                    ]
                  },

                  {
                    width: 118,

                    stack: [
                      {
                        text: order.courier || "Delhivery",
                        alignment: "center",
                        bold: true,
                        fontSize: 8,
                        margin: [0, 2, 0, 1]
                      },

                      {
                        image: awbBarcode,
                        width: 105,
                        height: 32,
                        alignment: "center",
                        margin: [0, 0, 0, 0]
                      },

                      {
                        text: order.awb || "-",
                        alignment: "center",
                        bold: true,
                        fontSize: 6.5,
                        margin: [0, 1, 0, 2]
                      }
                    ]
                  }
                ]
              }
            ],
             [ {
                columns: [
                  {
                    width: "*",

                    stack: [
                      {
                        text: `Booked Date: ${bookedDate}`,
                        fontSize: 7,
                        margin: [4, 0, 4, 4]
                      }

                      
                    ]
                  }
                ]
              
            }],

            // SHIPPER + ORDER BARCODE
          

            // TABLE
            [
              {
                table: {
                  headerRows: 1,
                  widths: [42, "*", 22, 30, 25],
                  body: tableBody
                },

                layout: {
                  hLineWidth: () => 1,
                  vLineWidth: () => 1,
                  hLineColor: () => "#000",
                  vLineColor: () => "#000",

                  paddingLeft: () => 1,
                  paddingRight: () => 1,
                  paddingTop: () => 1,
                  paddingBottom: () => 1
                }
              }
            ],

            // FOOTER
            [
              {
                text:
                  "THIS IS AN AUTO-GENERATED LABEL AND DOES NOT NEED SIGNATURE",

                alignment: "center",

                bold: true,

                fontSize: 5.5,

                margin: [2, 4, 2, 4]
              }
            ]
          ]
        },

        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => "#000",
          vLineColor: () => "#000",

          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0
        }
      }
    ]
  };

  pdfMake
    .createPdf(docDefinition)
    .download(`Label_${order.orderNumber}.pdf`);
}
// ----- Main label generation function -----

async function generateShippingLabel19(order) {
  let defaultdata = await getdefaultdata(order.warehouse, order.orderNumber);

  // Generate barcodes
  const awbBarcode = await generateBarcodeDataURL(order.awb);
  const orderBarcode = await generateBarcodeDataURL(order.orderNumber);
  const logoBase64 = await getBrandLogoBase64();

  // Order details
  const orderNumber = order.orderNumber || "-";
  const orderDate = order.orderDate || new Date().toLocaleDateString("en-IN");
  const customerName = order.customerName || "";

  const paymentMethod =
    order.financialStatus === "pending" ? "COD" : "Prepaid";

  // Address
  const shippingAddressLines = [
    customerName,
    order.addressLine1,
    order.addressLine2,
    order.landmark,
    `${order.city || ""}, ${order.state || ""}, IN`,
    order.pincode || ""
  ].filter(Boolean);

  // Dimensions & Weight
  let dims = {
    length: 10,
    width: 10,
    height: 10
  };

  let totalWeight = 0;

  order.items.forEach((item) => {
    dims.length = item.length || 10;
    dims.width = item.width || 10;
    dims.height = item.height || 10;

    totalWeight += item.deadWeight || 0;
  });

  const dimensionText = `${dims.height.toFixed(2)} x ${dims.width.toFixed(
    2
  )} x ${dims.length.toFixed(2)}`;

  const weightKg = totalWeight > 0 ? totalWeight.toFixed(2) : "0.45";

  // Warehouse
  const warehouse = defaultdata?.warehouse || {};

  const shipperName = warehouse.name || "HA.OK.DEL";

  const shipperAddress = [
    warehouse.address,
    warehouse.address2,
    `${warehouse.city || ""}, ${warehouse.state || ""}, India ${
      warehouse.pincode || ""
    }`
  ]
    .filter(Boolean)
    .join("\n");

  const bookedDate = order.processedAt
    ? new Date(order.processedAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : orderDate;

  // Table Body – Tax column removed (only SKU, Name, QTY)
  const tableBody = order.items.map((item) => [
    {
      text: item.sku || "-",
      fontSize: 6,
      margin: [2, 3, 2, 3]
    },
    {
      text: item.name || "-",
      fontSize: 6,
      margin: [2, 3, 2, 3]
    },
    {
      text: String(item.quantity || 1),
      alignment: "center",
      fontSize: 6,
      margin: [2, 3, 2, 3]
    }
  ]);

  // Amount
  const orderAmount =
    parseFloat(String(order.amount || "0").replace(/[^0-9.-]/g, "")) || 0;

  const grandTotal = orderAmount;

  // PDF definition – column widths: SKU, Name, QTY (Tax removed)
  const docDefinition = {
    pageSize: {
      width: 288,
      height: 432
    },

    pageMargins: [4, 4, 4, 4],

    content: [
      {
        table: {
          widths: ["*"],

          body: [
            [
              {
                stack: [
                  // SHIP TO
                  {
                    text: "Ship To",
                    bold: true,
                    fontSize: 9,
                    margin: [4, 4, 4, 2]
                  },

                  {
                    text: shippingAddressLines.join("\n"),
                    fontSize: 7,
                    margin: [4, 0, 4, 6],
                    lineHeight: 1.1
                  }
                ]
              }
            ],

            // PAYMENT + BARCODE
            [
              {
                columns: [
                  {
                    width: "*",
                    stack: [
                      {
                        text: [
                          { text: "Payment : ", bold: true },
                          paymentMethod
                        ],
                        fontSize: 8,
                        margin: [4, 4, 0, 3]
                      },

                      {
                        text: `Dimension(cm) : ${dimensionText}`,
                        fontSize: 7,
                        margin: [4, 0, 0, 2]
                      },

                      {
                        text: `Weight(kg) : ${weightKg}`,
                        fontSize: 7,
                        margin: [4, 0, 0, 2]
                      },

                      {
                        text: [
                          { text: "AWB No. : ", bold: true },
                          order.awb || "-"
                        ],
                        fontSize: 7,
                        margin: [4, 0, 0, 2]
                      }
                    ]
                  },

                  {
                    width: 120,

                    stack: [
                      {
                        text: order.courier || "-",
                        alignment: "center",
                        bold: true,
                        fontSize: 8,
                        margin: [0, 2, 0, 2]
                      },

                      awbBarcode
                        ? {
                            image: awbBarcode,
                            width: 110,
                            height: 40,
                            alignment: "center"
                          }
                        : {},

                      {
                        text: order.awb || "-",
                        alignment: "center",
                        bold: true,
                        fontSize: 7,
                        margin: [0, 2, 0, 2]
                      }
                    ]
                  }
                ]
              }
            ],

            // SHIPPED BY
            [
              {
                columns: [
                  {
                    width: "*",

                    stack: [
                      {
                        text: `Shipped By ${shipperName}`,
                        bold: true,
                        fontSize: 8,
                        margin: [4, 4, 4, 2]
                      },

                      {
                        text: shipperAddress,
                        fontSize: 7,
                        margin: [4, 0, 4, 2],
                        lineHeight: 1.1
                      },

                      {
                        text: `Booked Date: ${bookedDate}`,
                        fontSize: 7,
                        margin: [4, 0, 4, 4]
                      }
                    ]
                  },

                  {
                    width: 120,

                    stack: [
                      {
                        text: `Order No: ${orderNumber}`,
                        alignment: "center",
                        fontSize: 7,
                        margin: [0, 4, 0, 2]
                      },

                      orderBarcode
                        ? {
                            image: orderBarcode,
                            width: 110,
                            height: 40,
                            alignment: "center"
                          }
                        : {},

                      {
                        text: `Order Date: ${orderDate}`,
                        alignment: "center",
                        fontSize: 7,
                        margin: [0, 2, 0, 2]
                      }
                    ]
                  }
                ]
              }
            ],

            // TABLE (Tax column removed)
            [
              {
                margin: [0, 0, 0, 0],

                table: {
                  headerRows: 1,

                  // Widths: SKU, Name, QTY
                  widths: [55, "*", 35],

                  body: [
                    [
                      {
                        text: "SKU",
                        bold: true,
                        fontSize: 7,
                        margin: [2, 4, 2, 4]
                      },

                      {
                        text: "Name",
                        bold: true,
                        fontSize: 7,
                        margin: [2, 4, 2, 4]
                      },

                      {
                        text: "QTY",
                        bold: true,
                        alignment: "center",
                        fontSize: 7,
                        margin: [2, 4, 2, 4]
                      }
                    ],

                    ...tableBody,

                    // [
                    //   {
                    //     colSpan: 3,
                    //     text: `TOTAL Amount : Rs. ${grandTotal.toFixed(2)}`,
                    //     alignment: "right",
                    //     bold: true,
                    //     fontSize: 7,
                    //     margin: [0, 4, 6, 4]
                    //   },
                    //   {},
                    //   {}
                    // ]
                  ]
                }
              }
            ],

            // FOOTER
            [
              {
                stack: [
                  {
                    text:
                      "All disputes are subject to jurisdiction. Goods once sold will only be taken back or exchange as per the store's exchange/return policy.",
                    fontSize: 6,
                    margin: [4, 4, 4, 4],
                    lineHeight: 1.1
                  }
                ]
              }
            ],

            [
              {
                columns: [
                  {
                    width: "*",
                    text:
                      "THIS IS AN AUTO-GENERATED LABEL AND DOES NOT NEED SIGNATURE",
                    fontSize: 7,
                    bold: true,
                    margin: [4, 6, 4, 6]
                  },

                  logoBase64
                    ? {
                        image: logoBase64,
                        width: 80,
                        alignment: "center",
                        margin: [0, 0, 0, 5]
                      }
                    : {}
                ]
              }
            ]
          ]
        },

        layout: {
          hLineWidth: function () {
            return 1;
          },

          vLineWidth: function () {
            return 1;
          },

          hLineColor: function () {
            return "#000";
          },

          vLineColor: function () {
            return "#000";
          },

          paddingLeft: function () {
            return 0;
          },

          paddingRight: function () {
            return 0;
          },

          paddingTop: function () {
            return 0;
          },

          paddingBottom: function () {
            return 0;
          }
        }
      }
    ],

    defaultStyle: {
      fontSize: 7
    }
  };

  pdfMake.createPdf(docDefinition).download(`Label_${orderNumber}.pdf`);
}


async function generateShippingLabeldefault(order) {
  let defaultdata = await getdefaultdata(order.warehouse, order.orderNumber);

  // Generate barcodes
  const awbBarcode = await generateBarcodeDataURL(order.awb);
  const orderBarcode = await generateBarcodeDataURL(order.orderNumber);
  const logoBase64 = await getBrandLogoBase64();

  // Order details
  const orderNumber = order.orderNumber || "-";
  const orderDate = order.orderDate || new Date().toLocaleDateString("en-IN");
  const customerName = order.customerName || "";

  const paymentMethod =
    order.financialStatus === "pending" ? "COD" : "Prepaid";

  // Address
  const shippingAddressLines = [
    customerName,
    order.addressLine1,
    order.addressLine2,
    order.landmark,
    `${order.city || ""}, ${order.state || ""}, IN`,
    order.pincode || ""
  ].filter(Boolean);

  // Dimensions & Weight
  let dims = {
    length: 10,
    width: 10,
    height: 10
  };

  let totalWeight = 0;

  order.items.forEach((item) => {
    dims.length = item.length || 10;
    dims.width = item.width || 10;
    dims.height = item.height || 10;

    totalWeight += item.deadWeight || 0;
  });

  const dimensionText = `${dims.height.toFixed(2)} x ${dims.width.toFixed(
    2
  )} x ${dims.length.toFixed(2)}`;

  const weightKg = totalWeight > 0 ? totalWeight.toFixed(2) : "0.45";

  // Warehouse
  const warehouse = defaultdata?.warehouse || {};

  const shipperName = warehouse.name || "HA.OK.DEL";

  const shipperAddress = [
    warehouse.address,
    warehouse.address2,
    `${warehouse.city || ""}, ${warehouse.state || ""}, India ${
      warehouse.pincode || ""
    }`
  ]
    .filter(Boolean)
    .join("\n");

  const bookedDate = order.processedAt
    ? new Date(order.processedAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : orderDate;

  // Table Body – Tax column removed (only SKU, Name, QTY)
  const tableBody = order.items.map((item) => [
    {
      text: item.sku || "-",
      fontSize: 6,
      margin: [2, 3, 2, 3]
    },
    {
      text: item.name || "-",
      fontSize: 6,
      margin: [2, 3, 2, 3]
    },
    {
      text: String(item.quantity || 1),
      alignment: "center",
      fontSize: 6,
      margin: [2, 3, 2, 3]
    }
  ]);

  // Amount
  const orderAmount =
    parseFloat(String(order.amount || "0").replace(/[^0-9.-]/g, "")) || 0;

  const grandTotal = orderAmount;

  // PDF definition – column widths: SKU, Name, QTY (Tax removed)
  const docDefinition = {
    pageSize: {
      width: 288,
      height: 432
    },

    pageMargins: [4, 4, 4, 4],

    content: [
      {
        table: {
          widths: ["*"],

          body: [
            [
              {
                stack: [
                  // SHIP TO
                  {
                    text: "Ship To",
                    bold: true,
                    fontSize: 9,
                    margin: [4, 4, 4, 2]
                  },

                  {
                    text: shippingAddressLines.join("\n"),
                    fontSize: 7,
                    margin: [4, 0, 4, 6],
                    lineHeight: 1.1
                  }
                ]
              }
            ],

            // PAYMENT + BARCODE
            [
              {
                columns: [
                  {
                    width: "*",
                    stack: [
                      {
                        text: [
                          { text: "Payment : ", bold: true },
                          paymentMethod
                        ],
                        fontSize: 8,
                        margin: [4, 4, 0, 3]
                      },

                      {
                        text: `Dimension(cm) : ${dimensionText}`,
                        fontSize: 7,
                        margin: [4, 0, 0, 2]
                      },

                      {
                        text: `Weight(kg) : ${weightKg}`,
                        fontSize: 7,
                        margin: [4, 0, 0, 2]
                      },

                      {
                        text: [
                          { text: "AWB No. : ", bold: true },
                          order.awb || "-"
                        ],
                        fontSize: 7,
                        margin: [4, 0, 0, 2]
                      }
                    ]
                  },

                  {
                    width: 120,

                    stack: [
                      {
                        text: order.courier || "-",
                        alignment: "center",
                        bold: true,
                        fontSize: 8,
                        margin: [0, 2, 0, 2]
                      },

                      awbBarcode
                        ? {
                            image: awbBarcode,
                            width: 110,
                            height: 40,
                            alignment: "center"
                          }
                        : {},

                      {
                        text: order.awb || "-",
                        alignment: "center",
                        bold: true,
                        fontSize: 7,
                        margin: [0, 2, 0, 2]
                      }
                    ]
                  }
                ]
              }
            ],

            // SHIPPED BY
            [
              {
                columns: [
                  {
                    width: "*",

                    stack: [
                      {
                        text: `Shipped By ${shipperName}`,
                        bold: true,
                        fontSize: 8,
                        margin: [4, 4, 4, 2]
                      },

                      {
                        text: shipperAddress,
                        fontSize: 7,
                        margin: [4, 0, 4, 2],
                        lineHeight: 1.1
                      },

                      {
                        text: `Booked Date: ${bookedDate}`,
                        fontSize: 7,
                        margin: [4, 0, 4, 4]
                      }
                    ]
                  },

                  {
                    width: 120,

                    stack: [
                      {
                        text: `Order No: ${orderNumber}`,
                        alignment: "center",
                        fontSize: 7,
                        margin: [0, 4, 0, 2]
                      },

                      orderBarcode
                        ? {
                            image: orderBarcode,
                            width: 110,
                            height: 40,
                            alignment: "center"
                          }
                        : {},

                      {
                        text: `Order Date: ${orderDate}`,
                        alignment: "center",
                        fontSize: 7,
                        margin: [0, 2, 0, 2]
                      }
                    ]
                  }
                ]
              }
            ],

            // TABLE (Tax column removed)
            [
              {
                margin: [0, 0, 0, 0],

                table: {
                  headerRows: 1,

                  // Widths: SKU, Name, QTY
                  widths: [55, "*", 35],

                  body: [
                    [
                      {
                        text: "SKU",
                        bold: true,
                        fontSize: 7,
                        margin: [2, 4, 2, 4]
                      },

                      {
                        text: "Name",
                        bold: true,
                        fontSize: 7,
                        margin: [2, 4, 2, 4]
                      },

                      {
                        text: "QTY",
                        bold: true,
                        alignment: "center",
                        fontSize: 7,
                        margin: [2, 4, 2, 4]
                      }
                    ],

                    ...tableBody,

                    [
                      {
                        colSpan: 3,
                        text: `TOTAL Amount : Rs. ${grandTotal.toFixed(2)}`,
                        alignment: "right",
                        bold: true,
                        fontSize: 7,
                        margin: [0, 4, 6, 4]
                      },
                      {},
                      {}
                    ]
                  ]
                }
              }
            ],

            // FOOTER
            [
              {
                stack: [
                  {
                    text:
                      "All disputes are subject to jurisdiction. Goods once sold will only be taken back or exchange as per the store's exchange/return policy.",
                    fontSize: 6,
                    margin: [4, 4, 4, 4],
                    lineHeight: 1.1
                  }
                ]
              }
            ],

            [
              {
                columns: [
                  {
                    width: "*",
                    text:
                      "THIS IS AN AUTO-GENERATED LABEL AND DOES NOT NEED SIGNATURE",
                    fontSize: 7,
                    bold: true,
                    margin: [4, 6, 4, 6]
                  },

                  logoBase64
                    ? {
                        image: logoBase64,
                        width: 80,
                        alignment: "center",
                        margin: [0, 0, 0, 5]
                      }
                    : {}
                ]
              }
            ]
          ]
        },

        layout: {
          hLineWidth: function () {
            return 1;
          },

          vLineWidth: function () {
            return 1;
          },

          hLineColor: function () {
            return "#000";
          },

          vLineColor: function () {
            return "#000";
          },

          paddingLeft: function () {
            return 0;
          },

          paddingRight: function () {
            return 0;
          },

          paddingTop: function () {
            return 0;
          },

          paddingBottom: function () {
            return 0;
          }
        }
      }
    ],

    defaultStyle: {
      fontSize: 7
    }
  };

  pdfMake.createPdf(docDefinition).download(`Label_${orderNumber}.pdf`);
}

async function generateShippingLabel(order){
  switch(Number(getuser()?.id)){
    case 11:
      await generateShippingLabel11(order)
      break;

        case 19:
      await generateShippingLabel19(order)
      break;
    default:
      await generateShippingLabeldefault(order)
      // await generateShippingLabel11(order)

  }
}




async function generateOrderPDF(order) {
  let defaultdata = await getdefaultdata(order.warehouse, order.orderNumber);

  const qrDataUrl = await generateAWBQRCode(order.awb || 'N/A');
  const logoo = await getBrandLogoBase64();

  const formatCurrency = (amount) => {
    if (typeof amount === 'number') {
      return `₹${amount.toFixed(2)}`;
    }
    const numeric = parseFloat(String(amount).replace(/[^0-9.-]/g, ''));
    return isNaN(numeric) ? '₹0.00' : `₹${numeric.toFixed(2)}`;
  };

  const orderNumber = order.orderNumber;
  const orderDate = order.orderDate;
  const customerName = order.customerName;
  const customerPhone = order.customerPhone;
  const customerEmail = order.customerEmail;
  const paymentMethod = order.financialStatus === 'pending' ? 'Cash on Delivery' : 'Prepaid';
  const financialStatus = order.financialStatus === 'paid' ? 'Paid' : 'Pending';
  const shippingAddress = [
    order.addressLine1,
    order.addressLine2,
    order.landmark,
    `${order.city}, ${order.state} - ${order.pincode}`
  ].filter(Boolean).join(', ');

  // Calculate actual GST amount from items
  let calculatedTotalTax = 0;
  let calculatedSubtotal = 0;
  
  order.items.forEach((item) => {
    const itemSubtotal = item.unitPrice * item.quantity;
    const itemGstAmount = (itemSubtotal * item.gstRate) / 100;
    calculatedSubtotal += itemSubtotal;
    calculatedTotalTax += itemGstAmount;
  });

  const itemsTableBody = order.items.map((item, idx) => [
    { text: (idx + 1).toString(), alignment: 'center' },
    { text: item.name },
    { text: item.quantity.toString(), alignment: 'center' },
    { text: formatCurrency(item.unitPrice), alignment: 'right' },
    { text: `${item.gstRate}%`, alignment: 'center' },
    { text: formatCurrency(item.totalPrice || (item.unitPrice * item.quantity + (item.unitPrice * item.quantity * item.gstRate) / 100)), alignment: 'right' }
  ]);

  // Use calculated values instead of order.totalTax
  const subtotal = calculatedSubtotal;
  const totalTax = calculatedTotalTax;
  const grandTotal = subtotal + totalTax;

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    content: [
      // Header with centered logo and right-aligned order details
      {
        columns: [
          { width: 'auto', text: '' }, // left spacer
          {
            width: '*',
            stack: [
              { text: defaultdata.warehouse.name, style: 'sectionHeader', alignment: 'center' },
              { text: 'INVOICE', style: 'header', alignment: 'center' }
            ]
          },
          {
            width: 'auto',
            stack: [
              { text: `Order #: ${orderNumber}\nDate: ${orderDate}`, alignment: 'right', style: 'subheader' },
              qrDataUrl ? { image: qrDataUrl, width: 70, alignment: 'right', margin: [0, 5, 0, 0] } : {}
            ]
          }
        ]
      },
      { text: '\n' },
      // Company & Customer details
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'SHIP & RETURN ADDRESS', style: 'sectionHeader' },
              { text: defaultdata.warehouse.name, bold: true },
              { text: defaultdata.warehouse.address },
              { text: defaultdata.warehouse.city + " ," + defaultdata.warehouse.state + " - " + defaultdata.warehouse.pincode },
            ]
          },
          {
            width: '*',
            stack: [
              { text: 'SHIP TO', style: 'sectionHeader' },
              { text: customerName, bold: true },
              { text: shippingAddress },
              { text: `Phone: ${customerPhone}` },
              { text: `Email: ${customerEmail || '—'}` }
            ]
          }
        ]
      },
      { text: '\n' },
      // Order summary
      {
        columns: [
          { text: `Payment Method: ${paymentMethod}`, width: '*' },
          { text: `Shipped By: ${order.courier?.toLowerCase().includes("smc") ? "Shree Maruti" : order.courier}`, width: '*' },
          { text: `AWBID: ${order.awb}`, width: '*' }
        ]
      },
      { text: '\n' },
      // Items table
      {
        table: {
          headerRows: 1,
          widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: 'S.No', style: 'tableHeader', alignment: 'center' },
              { text: 'Product', style: 'tableHeader' },
              { text: 'Qty', style: 'tableHeader', alignment: 'center' },
              { text: 'Unit Price', style: 'tableHeader', alignment: 'right' },
              { text: 'GST', style: 'tableHeader', alignment: 'center' },
              { text: 'Total', style: 'tableHeader', alignment: 'right' }
            ],
            ...itemsTableBody,
            [
              { text: '', colSpan: 5, alignment: 'right' },
              {},
              {},
              {},
              {},
              { text: formatCurrency(grandTotal), alignment: 'right', bold: true }
            ]
          ]
        },
        layout: 'lightHorizontalLines'
      },
      { text: '\n' },
      // Totals breakdown - Fixed to show correct tax amount
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 'auto',
            stack: [
              { text: 'Subtotal:', alignment: 'right' },
              { text: `Tax (GST):`, alignment: 'right' },
              { text: 'Grand Total:', alignment: 'right', bold: true }
            ]
          },
          {
            width: 'auto',
            stack: [
              { text: formatCurrency(subtotal), alignment: 'right' },
              { text: formatCurrency(totalTax), alignment: 'right' },
              { text: formatCurrency(grandTotal), alignment: 'right', bold: true }
            ]
          }
        ]
      },
      { text: '\n\n' },
    ],
    styles: {
      header: { fontSize: 24, bold: true, color: '#1e3a8a' },
      subheader: { fontSize: 10, color: '#666' },
      sectionHeader: { fontSize: 12, bold: true, margin: [0, 0, 0, 5], color: '#1e3a8a' },
      tableHeader: { bold: true, fontSize: 11, fillColor: '#eef2ff', color: '#1e3a8a' },
      footer: { fontSize: 9, color: '#888', italics: true }
    },
    defaultStyle: { fontSize: 10, lineHeight: 1.4 }
  };

  pdfMake.createPdf(docDefinition).download(`Invoice_${orderNumber}.pdf`);
}


async function generateOrderPDFbulk(orderList) {
  const pdfMake = window.pdfMake;

  const allContent = [];

  for (let index = 0; index < orderList.length; index++) {
    const order = orderList[index];

    let defaultdata = await getdefaultdata(
      order.warehouse,
      order.orderNumber
    );

    const qrDataUrl = await generateAWBQRCode(order.awb || "N/A");
    const logoo = await getBrandLogoBase64();

    const formatCurrency = (amount) => {
      if (typeof amount === "number") {
        return `₹${amount.toFixed(2)}`;
      }

      const numeric = parseFloat(
        String(amount).replace(/[^0-9.-]/g, "")
      );

      return isNaN(numeric)
        ? "₹0.00"
        : `₹${numeric.toFixed(2)}`;
    };

    const paymentMethod =
      order.financialStatus === "pending"
        ? "Cash on Delivery"
        : "Prepaid";

    const shippingAddress = [
      order.addressLine1,
      order.addressLine2,
      order.landmark,
      `${order.city}, ${order.state} - ${order.pincode}`,
    ]
      .filter(Boolean)
      .join(", ");

    const itemsTableBody = order.items.map((item, idx) => [
      { text: (idx + 1).toString(), alignment: "center" },
      { text: item.name },
      { text: item.quantity.toString(), alignment: "center" },
      {
        text: formatCurrency(item.unitPrice),
        alignment: "right",
      },
      {
        text: `${item.gstRate}%`,
        alignment: "center",
      },
      {
        text: formatCurrency(item.totalPrice),
        alignment: "right",
      },
    ]);

    const totalTax = parseFloat(order.totalTax) || 0;

    const grandTotal =
      parseFloat(
        String(order.amount).replace(/[^0-9.-]/g, "")
      ) || 0;

    allContent.push(
      // HEADER
      {
        columns: [
          { width: "auto", text: "" },

          {
            width: "*",
            stack: [
              // logoo
              //   ? {
              //       image: logoo,
              //       width: 80,
              //       alignment: "center",
              //       margin: [0, 0, 0, 5],
              //     }
              //   : {},

              {
                text: defaultdata.warehouse.name,
                style: "sectionHeader",
                alignment: "center",
              },

              {
                text: "INVOICE",
                style: "header",
                alignment: "center",
              },
            ],
          },

          {
            width: "auto",
            stack: [
              {
                text: `Order #: ${order.orderNumber}\nDate: ${order.orderDate}`,
                alignment: "right",
                style: "subheader",
              },

              qrDataUrl
                ? {
                    image: qrDataUrl,
                    width: 70,
                    alignment: "right",
                    margin: [0, 5, 0, 0],
                  }
                : {},
            ],
          },
        ],
      },

      { text: "\n" },

      // ADDRESS
      {
        columns: [
          {
            width: "*",

            stack: [
              {
                text: "SHIP & RETURN ADDRESS",
                style: "sectionHeader",
              },

              {
                text: defaultdata.warehouse.name,
                bold: true,
              },

              {
                text: defaultdata.warehouse.address,
              },

              {
                text:
                  defaultdata.warehouse.city +
                  ", " +
                  defaultdata.warehouse.state +
                  " - " +
                  defaultdata.warehouse.pincode,
              },
            ],
          },

          {
            width: "*",

            stack: [
              {
                text: "SHIP TO",
                style: "sectionHeader",
              },

              {
                text: order.customerName,
                bold: true,
              },

              {
                text: shippingAddress,
              },

              {
                text: `Phone: ${order.customerPhone}`,
              },

              {
                text: `Email: ${
                  order.customerEmail || "—"
                }`,
              },
            ],
          },
        ],
      },

      { text: "\n" },

      // ORDER SUMMARY
      {
        columns: [
          {
            text: `Payment Method: ${paymentMethod}`,
            width: "*",
          },

          {
            text: `Shipped By: ${
              order.courier
                .toLowerCase()
                .includes("smc")
                ? "Shree Maruti"
                : order.courier
            }`,
            width: "*",
          },

          {
            text: `AWBID: ${order.awb}`,
            width: "*",
          },
        ],
      },

      { text: "\n" },

      // ITEMS TABLE
      {
        table: {
          headerRows: 1,

          widths: [
            "auto",
            "*",
            "auto",
            "auto",
            "auto",
            "auto",
          ],

          body: [
            [
              {
                text: "S.No",
                style: "tableHeader",
                alignment: "center",
              },

              {
                text: "Product",
                style: "tableHeader",
              },

              {
                text: "Qty",
                style: "tableHeader",
                alignment: "center",
              },

              {
                text: "Unit Price",
                style: "tableHeader",
                alignment: "right",
              },

              {
                text: "GST",
                style: "tableHeader",
                alignment: "center",
              },

              {
                text: "Total",
                style: "tableHeader",
                alignment: "right",
              },
            ],

            ...itemsTableBody,

            [
              {
                text: "",
                colSpan: 5,
                alignment: "right",
              },

              {},
              {},
              {},
              {},

              {
                text: formatCurrency(grandTotal),
                alignment: "right",
                bold: true,
              },
            ],
          ],
        },

        layout: "lightHorizontalLines",
      },

      { text: "\n" },

      // TOTALS
      {
        columns: [
          {
            width: "*",
            text: "",
          },

          {
            width: "auto",

            stack: [
              {
                text: `Tax (GST):`,
                alignment: "right",
              },

              {
                text: "Grand Total:",
                alignment: "right",
                bold: true,
              },
            ],
          },

          {
            width: "auto",

            stack: [
              {
                text: formatCurrency(totalTax),
                alignment: "right",
              },

              {
                text: formatCurrency(grandTotal),
                alignment: "right",
                bold: true,
              },
            ],
          },
        ],
      }
    );

    // PAGE BREAK BETWEEN ORDERS
    if (index !== orderList.length - 1) {
      allContent.push({
        text: "",
        pageBreak: "after",
      });
    }
  }

  const docDefinition = {
    pageSize: "A4",

    pageMargins: [40, 60, 40, 60],

    content: allContent,

    styles: {
      header: {
        fontSize: 24,
        bold: true,
        color: "#1e3a8a",
      },

      subheader: {
        fontSize: 10,
        color: "#666",
      },

      sectionHeader: {
        fontSize: 12,
        bold: true,
        margin: [0, 0, 0, 5],
        color: "#1e3a8a",
      },

      tableHeader: {
        bold: true,
        fontSize: 11,
        fillColor: "#eef2ff",
        color: "#1e3a8a",
      },
    },

    defaultStyle: {
      fontSize: 10,
      lineHeight: 1.4,
    },
  };

  pdfMake
    .createPdf(docDefinition)
    .download(`Bulk_Invoices.pdf`);
}


// async function buildShippingLabelDefault(order) {
  
//   const defaultdata = await getdefaultdata(
//     order.warehouse,
//     order.orderNumber
//   );

//   const awbBarcode = await generateBarcodeDataURL(order.awb);
//   const orderBarcode = await generateBarcodeDataURL(order.orderNumber);
//   const logoBase64 = await getBrandLogoBase64();

//   const customerName = order.customerName || "";

//   const paymentMethod =
//     order.financialStatus === "pending"
//       ? "COD"
//       : "Prepaid";

//   const shippingAddressLines = [
//     customerName,
//     order.addressLine1,
//     order.addressLine2,
//     order.landmark,
//     `${order.city || ""}, ${order.state || ""}, IN`,
//     order.pincode || ""
//   ].filter(Boolean);

//   let dims = {
//     length: 10,
//     width: 10,
//     height: 10
//   };

//   let totalWeight = 0;

//   order.items.forEach((item) => {
//     dims.length = item.length || 10;
//     dims.width = item.width || 10;
//     dims.height = item.height || 10;

//     totalWeight += item.deadWeight || 0;
//   });

//   const dimensionText = `${dims.height.toFixed(
//     2
//   )} x ${dims.width.toFixed(
//     2
//   )} x ${dims.length.toFixed(2)}`;

//   const weightKg =
//     totalWeight > 0
//       ? totalWeight.toFixed(2)
//       : "0.45";

//   const warehouse = defaultdata?.warehouse || {};

//   const shipperName =
//     warehouse.name || "HA.OK.DEL";

//   const shipperAddress = [
//     warehouse.address,
//     warehouse.address2,
//     `${warehouse.city || ""}, ${
//       warehouse.state || ""
//     }, India ${warehouse.pincode || ""}`
//   ]
//     .filter(Boolean)
//     .join("\n");

//   const bookedDate = order.processedAt
//     ? new Date(order.processedAt).toLocaleString(
//         "en-IN",
//         {
//           day: "2-digit",
//           month: "short",
//           year: "numeric",
//           hour: "2-digit",
//           minute: "2-digit"
//         }
//       )
//     : order.orderDate;

//   const tableBody = order.items.map((item) => [
//     {
//       text: item.sku || "-",
//       fontSize: 6,
//       margin: [2, 3, 2, 3]
//     },
//     {
//       text: item.name || "-",
//       fontSize: 6,
//       margin: [2, 3, 2, 3]
//     },
//     {
//       text: String(item.quantity || 1),
//       alignment: "center",
//       fontSize: 6,
//       margin: [2, 3, 2, 3]
//     }
//   ]);

//   const grandTotal =
//     parseFloat(
//       String(order.amount || "0").replace(
//         /[^0-9.-]/g,
//         ""
//       )
//     ) || 0;

//   return [
//     {
//       table: {
//         widths: ["*"],

//         body: [
//           [
//             {
//               stack: [
//                 {
//                   text: "Ship To",
//                   bold: true,
//                   fontSize: 9,
//                   margin: [4, 4, 4, 2]
//                 },
//                 {
//                   text: shippingAddressLines.join("\n"),
//                   fontSize: 7,
//                   margin: [4, 0, 4, 6],
//                   lineHeight: 1.1
//                 }
//               ]
//             }
//           ],

//           [
//             {
//               columns: [
//                 {
//                   width: "*",
//                   stack: [
//                     {
//                       text: [
//                         { text: "Payment : ", bold: true },
//                         paymentMethod
//                       ],
//                       fontSize: 8,
//                       margin: [4, 4, 0, 3]
//                     },
//                     {
//                       text: `Dimension(cm) : ${dimensionText}`,
//                       fontSize: 7,
//                       margin: [4, 0, 0, 2]
//                     },
//                     {
//                       text: `Weight(kg) : ${weightKg}`,
//                       fontSize: 7,
//                       margin: [4, 0, 0, 2]
//                     },
//                     {
//                       text: [
//                         { text: "AWB No. : ", bold: true },
//                         order.awb || "-"
//                       ],
//                       fontSize: 7,
//                       margin: [4, 0, 0, 2]
//                     }
//                   ]
//                 },
//                 {
//                   width: 120,
//                   stack: [
//                     {
//                       text: order.courier || "-",
//                       alignment: "center",
//                       bold: true,
//                       fontSize: 8,
//                       margin: [0, 2, 0, 2]
//                     },
//                     awbBarcode
//                       ? {
//                           image: awbBarcode,
//                           width: 110,
//                           height: 40,
//                           alignment: "center"
//                         }
//                       : {},
//                     {
//                       text: order.awb || "-",
//                       alignment: "center",
//                       bold: true,
//                       fontSize: 7,
//                       margin: [0, 2, 0, 2]
//                     }
//                   ]
//                 }
//               ]
//             }
//           ],

//           [
//             {
//               columns: [
//                 {
//                   width: "*",
//                   stack: [
//                     {
//                       text: `Shipped By ${shipperName}`,
//                       bold: true,
//                       fontSize: 8,
//                       margin: [4, 4, 4, 2]
//                     },
//                     {
//                       text: shipperAddress,
//                       fontSize: 7,
//                       margin: [4, 0, 4, 2],
//                       lineHeight: 1.1
//                     },
//                     {
//                       text: `Booked Date: ${bookedDate}`,
//                       fontSize: 7,
//                       margin: [4, 0, 4, 4]
//                     }
//                   ]
//                 },
//                 {
//                   width: 120,
//                   stack: [
//                     {
//                       text: `Order No: ${order.orderNumber}`,
//                       alignment: "center",
//                       fontSize: 7,
//                       margin: [0, 4, 0, 2]
//                     },
//                     orderBarcode
//                       ? {
//                           image: orderBarcode,
//                           width: 110,
//                           height: 40,
//                           alignment: "center"
//                         }
//                       : {},
//                     {
//                       text: `Order Date: ${order.orderDate}`,
//                       alignment: "center",
//                       fontSize: 7,
//                       margin: [0, 2, 0, 2]
//                     }
//                   ]
//                 }
//               ]
//             }
//           ],

//           [
//             {
//               table: {
//                 headerRows: 1,
//                 widths: [55, "*", 25], // SKU, Name, QTY
//                 body: [
//                   [
//                     {
//                       text: "SKU",
//                       bold: true,
//                       fontSize: 7,
//                       margin: [2, 4, 2, 4]
//                     },
//                     {
//                       text: "Name",
//                       bold: true,
//                       fontSize: 7,
//                       margin: [2, 4, 2, 4]
//                     },
//                     {
//                       text: "QTY",
//                       bold: true,
//                       alignment: "center",
//                       fontSize: 7,
//                       margin: [2, 4, 2, 4]
//                     }
//                   ],
//                   ...tableBody,
//                   [
//                     {
//                       colSpan: 3,
//                       text: `TOTAL Amount : Rs. ${grandTotal.toFixed(2)}`,
//                       alignment: "right",
//                       bold: true,
//                       fontSize: 7,
//                       margin: [0, 4, 6, 4]
//                     },
//                     {},
//                     {}
//                   ]
//                 ]
//               }
//             }
//           ],

//           [
//             {
//               text: "THIS IS AN AUTO-GENERATED LABEL AND DOES NOT NEED SIGNATURE",
//               fontSize: 7,
//               bold: true,
//               margin: [4, 6, 4, 6]
//             }
//           ]
//         ]
//       },

//       layout: {
//         hLineWidth: () => 1,
//         vLineWidth: () => 1,
//         hLineColor: () => "#000",
//         vLineColor: () => "#000",
//         paddingLeft: () => 0,
//         paddingRight: () => 0,
//         paddingTop: () => 0,
//         paddingBottom: () => 0
//       },

//       pageBreak: "after"
//     }
//   ];
// }
async function buildShippingLabelDefault(order) {
  
  const defaultdata = await getdefaultdata(
    order.warehouse,
    order.orderNumber
  );

  // Generate barcodes with larger dimensions for better scanning
  const awbBarcode = await generateBarcodeDataURL(order.awb, 2.5, 50);
  const orderBarcode = await generateBarcodeDataURL(order.orderNumber, 2.5, 45);
  const logoBase64 = await getBrandLogoBase64();

  const customerName = order.customerName || "";

  const paymentMethod =
    order.financialStatus === "pending"
      ? "COD"
      : "Prepaid";

  const shippingAddressLines = [
    customerName,
    order.addressLine1,
    order.addressLine2,
    order.landmark,
    `${order.city || ""}, ${order.state || ""}, IN`,
    order.pincode || ""
  ].filter(Boolean);

  let dims = {
    length: 10,
    width: 10,
    height: 10
  };

  let totalWeight = 0;

  order.items.forEach((item) => {
    dims.length = item.length || 10;
    dims.width = item.width || 10;
    dims.height = item.height || 10;
    totalWeight += item.deadWeight || 0;
  });

  const dimensionText = `${dims.height.toFixed(2)} x ${dims.width.toFixed(2)} x ${dims.length.toFixed(2)}`;
  const weightKg = totalWeight > 0 ? totalWeight.toFixed(2) : "0.45";

  const warehouse = defaultdata?.warehouse || {};
  const shipperName = warehouse.name || "HA.OK.DEL";
  const shipperAddress = [
    warehouse.address,
    warehouse.address2,
    `${warehouse.city || ""}, ${warehouse.state || ""}, India ${warehouse.pincode || ""}`
  ].filter(Boolean).join("\n");

  const bookedDate = order.processedAt
    ? new Date(order.processedAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : order.orderDate;

  const tableBody = order.items.map((item) => [
    {
      text: item.sku || "-",
      fontSize: 8,  // Increased font size
      margin: [3, 4, 3, 4]
    },
    {
      text: item.name || "-",
      fontSize: 8,  // Increased font size
      margin: [3, 4, 3, 4]
    },
    {
      text: String(item.quantity || 1),
      alignment: "center",
      fontSize: 8,  // Increased font size
      margin: [3, 4, 3, 4]
    }
  ]);

  const grandTotal = parseFloat(String(order.amount || "0").replace(/[^0-9.-]/g, "")) || 0;

  return [
    {
      // INCREASED LABEL SIZE from 288x432 to 350x520
      pageSize: {
        width: 350,   // Was 288
        height: 520   // Was 432
      },
      
      pageMargins: [6, 6, 6, 6],  // Slightly larger margins

      defaultStyle: {
        fontSize: 9  // Increased default font size
      },

      table: {
        widths: ["*"],

        body: [
          [
            {
              stack: [
                {
                  text: "SHIP TO",
                  bold: true,
                  fontSize: 11,  // Larger heading
                  margin: [6, 6, 6, 3],
                  color: "#1e3a8a"
                },
                {
                  text: shippingAddressLines.join("\n"),
                  fontSize: 9,
                  margin: [6, 0, 6, 8],
                  lineHeight: 1.3
                }
              ]
            }
          ],

          [
            {
              columns: [
                {
                  width: "*",
                  stack: [
                    {
                      text: [
                        { text: "PAYMENT : ", bold: true, fontSize: 9 },
                        { text: paymentMethod, fontSize: 9 }
                      ],
                      margin: [6, 4, 0, 3]
                    },
                    {
                      text: `Dimensions : ${dimensionText} cm`,
                      fontSize: 8,
                      margin: [6, 0, 0, 2]
                    },
                    {
                      text: `Weight : ${weightKg} kg`,
                      fontSize: 8,
                      margin: [6, 0, 0, 2]
                    },
                    {
                      text: [
                        { text: "AWB No. : ", bold: true, fontSize: 9 },
                        { text: order.awb || "-", fontSize: 9 }
                      ],
                      margin: [6, 3, 0, 2]
                    }
                  ]
                },
                {
                  width: 150,  // Increased from 120
                  stack: [
                    {
                      text: order.courier || "-",
                      alignment: "center",
                      bold: true,
                      fontSize: 11,
                      margin: [0, 3, 0, 3],
                      color: "#1e3a8a"
                    },
                    awbBarcode
                      ? {
                          image: awbBarcode,
                          width: 140,   // Increased from 110
                          height: 55,   // Increased from 40
                          alignment: "center",
                          margin: [0, 5, 0, 5]
                        }
                      : {},
                    {
                      text: order.awb || "-",
                      alignment: "center",
                      bold: true,
                      fontSize: 10,
                      margin: [0, 3, 0, 5]
                    }
                  ]
                }
              ]
            }
          ],

          [
            {
              columns: [
                {
                  width: "*",
                  stack: [
                    {
                      text: `SHIPPED BY : ${shipperName}`,
                      bold: true,
                      fontSize: 9,
                      margin: [6, 4, 4, 2]
                    },
                    {
                      text: shipperAddress,
                      fontSize: 8,
                      margin: [6, 0, 4, 2],
                      lineHeight: 1.2
                    },
                    {
                      text: `Booked : ${bookedDate}`,
                      fontSize: 8,
                      margin: [6, 3, 4, 4],
                      color: "#666"
                    }
                  ]
                },
                {
                  width: 150,  // Increased from 120
                  stack: [
                    {
                      text: `ORDER #`,
                      alignment: "center",
                      bold: true,
                      fontSize: 9,
                      margin: [0, 4, 0, 2]
                    },
                    {
                      text: order.orderNumber,
                      alignment: "center",
                      bold: true,
                      fontSize: 10,
                      margin: [0, 0, 0, 3],
                      color: "#1e3a8a"
                    },
                    orderBarcode
                      ? {
                          image: orderBarcode,
                          width: 140,   // Increased from 110
                          height: 55,   // Increased from 40
                          alignment: "center",
                          margin: [0, 5, 0, 5]
                        }
                      : {},
                    {
                      text: `Date: ${order.orderDate}`,
                      alignment: "center",
                      fontSize: 8,
                      margin: [0, 3, 0, 4]
                    }
                  ]
                }
              ]
            }
          ],

          [
            {
              table: {
                headerRows: 1,
                widths: [70, "*", 35], // SKU, Name, QTY - wider columns
                body: [
                  [
                    {
                      text: "SKU",
                      bold: true,
                      fontSize: 9,
                      fillColor: "#eef2ff",
                      margin: [4, 6, 4, 6]
                    },
                    {
                      text: "PRODUCT NAME",
                      bold: true,
                      fontSize: 9,
                      fillColor: "#eef2ff",
                      margin: [4, 6, 4, 6]
                    },
                    {
                      text: "QTY",
                      bold: true,
                      alignment: "center",
                      fontSize: 9,
                      fillColor: "#eef2ff",
                      margin: [4, 6, 4, 6]
                    }
                  ],
                  ...tableBody,
                  [
                    {
                      colSpan: 3,
                      text: `TOTAL : ₹ ${grandTotal.toFixed(2)}`,
                      alignment: "right",
                      bold: true,
                      fontSize: 10,
                      margin: [0, 8, 12, 8]
                    },
                    {},
                    {}
                  ]
                ]
              },
              layout: {
                hLineWidth: () => 0.8,
                vLineWidth: () => 0.8,
                hLineColor: () => "#000",
                vLineColor: () => "#000"
              }
            }
          ],

          [
            {
              text: "THIS IS AN AUTO-GENERATED LABEL AND DOES NOT REQUIRE SIGNATURE",
              fontSize: 7,
              bold: true,
              alignment: "center",
              margin: [6, 10, 6, 6],
              color: "#666"
            }
          ]
        ]
      },

      layout: {
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        hLineColor: () => "#000",
        vLineColor: () => "#000",
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0
      },

      pageBreak: "after"
    }
  ];
}

async function buildShippingLabel19(order) {
  
  const defaultdata = await getdefaultdata(
    order.warehouse,
    order.orderNumber
  );

  const awbBarcode = await generateBarcodeDataURL(order.awb);
  const orderBarcode = await generateBarcodeDataURL(order.orderNumber);
  const logoBase64 = await getBrandLogoBase64();

  const customerName = order.customerName || "";

  const paymentMethod =
    order.financialStatus === "pending"
      ? "COD"
      : "Prepaid";

  const shippingAddressLines = [
    customerName,
    order.addressLine1,
    order.addressLine2,
    order.landmark,
    `${order.city || ""}, ${order.state || ""}, IN`,
    order.pincode || ""
  ].filter(Boolean);

  let dims = {
    length: 10,
    width: 10,
    height: 10
  };

  let totalWeight = 0;

  order.items.forEach((item) => {
    dims.length = item.length || 10;
    dims.width = item.width || 10;
    dims.height = item.height || 10;

    totalWeight += item.deadWeight || 0;
  });

  const dimensionText = `${dims.height.toFixed(
    2
  )} x ${dims.width.toFixed(
    2
  )} x ${dims.length.toFixed(2)}`;

  const weightKg =
    totalWeight > 0
      ? totalWeight.toFixed(2)
      : "0.45";

  const warehouse = defaultdata?.warehouse || {};

  const shipperName =
    warehouse.name || "HA.OK.DEL";

  const shipperAddress = [
    warehouse.address,
    warehouse.address2,
    `${warehouse.city || ""}, ${
      warehouse.state || ""
    }, India ${warehouse.pincode || ""}`
  ]
    .filter(Boolean)
    .join("\n");

  const bookedDate = order.processedAt
    ? new Date(order.processedAt).toLocaleString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }
      )
    : order.orderDate;

  const tableBody = order.items.map((item) => [
    {
      text: item.sku || "-",
      fontSize: 6,
      margin: [2, 3, 2, 3]
    },
    {
      text: item.name || "-",
      fontSize: 6,
      margin: [2, 3, 2, 3]
    },
    {
      text: String(item.quantity || 1),
      alignment: "center",
      fontSize: 6,
      margin: [2, 3, 2, 3]
    }
  ]);

  const grandTotal =
    parseFloat(
      String(order.amount || "0").replace(
        /[^0-9.-]/g,
        ""
      )
    ) || 0;

  return [
    {
      table: {
        widths: ["*"],

        body: [
          [
            {
              stack: [
                {
                  text: "Ship To",
                  bold: true,
                  fontSize: 9,
                  margin: [4, 4, 4, 2]
                },
                {
                  text: shippingAddressLines.join("\n"),
                  fontSize: 7,
                  margin: [4, 0, 4, 6],
                  lineHeight: 1.1
                }
              ]
            }
          ],

          [
            {
              columns: [
                {
                  width: "*",
                  stack: [
                    {
                      text: [
                        { text: "Payment : ", bold: true },
                        paymentMethod
                      ],
                      fontSize: 8,
                      margin: [4, 4, 0, 3]
                    },
                    {
                      text: `Dimension(cm) : ${dimensionText}`,
                      fontSize: 7,
                      margin: [4, 0, 0, 2]
                    },
                    {
                      text: `Weight(kg) : ${weightKg}`,
                      fontSize: 7,
                      margin: [4, 0, 0, 2]
                    },
                    {
                      text: [
                        { text: "AWB No. : ", bold: true },
                        order.awb || "-"
                      ],
                      fontSize: 7,
                      margin: [4, 0, 0, 2]
                    }
                  ]
                },
                {
                  width: 120,
                  stack: [
                    {
                      text: order.courier || "-",
                      alignment: "center",
                      bold: true,
                      fontSize: 8,
                      margin: [0, 2, 0, 2]
                    },
                    awbBarcode
                      ? {
                          image: awbBarcode,
                          width: 110,
                          height: 40,
                          alignment: "center"
                        }
                      : {},
                    {
                      text: order.awb || "-",
                      alignment: "center",
                      bold: true,
                      fontSize: 7,
                      margin: [0, 2, 0, 2]
                    }
                  ]
                }
              ]
            }
          ],

          [
            {
              columns: [
                {
                  width: "*",
                  stack: [
                    {
                      text: `Shipped By ${shipperName}`,
                      bold: true,
                      fontSize: 8,
                      margin: [4, 4, 4, 2]
                    },
                    {
                      text: shipperAddress,
                      fontSize: 7,
                      margin: [4, 0, 4, 2],
                      lineHeight: 1.1
                    },
                    {
                      text: `Booked Date: ${bookedDate}`,
                      fontSize: 7,
                      margin: [4, 0, 4, 4]
                    }
                  ]
                },
                {
                  width: 120,
                  stack: [
                    {
                      text: `Order No: ${order.orderNumber}`,
                      alignment: "center",
                      fontSize: 7,
                      margin: [0, 4, 0, 2]
                    },
                    orderBarcode
                      ? {
                          image: orderBarcode,
                          width: 110,
                          height: 40,
                          alignment: "center"
                        }
                      : {},
                    {
                      text: `Order Date: ${order.orderDate}`,
                      alignment: "center",
                      fontSize: 7,
                      margin: [0, 2, 0, 2]
                    }
                  ]
                }
              ]
            }
          ],

          [
            {
              table: {
                headerRows: 1,
                widths: [55, "*", 25], // SKU, Name, QTY
                body: [
                  [
                    {
                      text: "SKU",
                      bold: true,
                      fontSize: 7,
                      margin: [2, 4, 2, 4]
                    },
                    {
                      text: "Name",
                      bold: true,
                      fontSize: 7,
                      margin: [2, 4, 2, 4]
                    },
                    {
                      text: "QTY",
                      bold: true,
                      alignment: "center",
                      fontSize: 7,
                      margin: [2, 4, 2, 4]
                    }
                  ],
                  ...tableBody,
                  // [
                  //   {
                  //     colSpan: 3,
                  //     text: `TOTAL Amount : Rs. ${grandTotal.toFixed(2)}`,
                  //     alignment: "right",
                  //     bold: true,
                  //     fontSize: 7,
                  //     margin: [0, 4, 6, 4]
                  //   },
                  //   {},
                  //   {}
                  // ]
                ]
              }
            }
          ],

          [
            {
              text: "THIS IS AN AUTO-GENERATED LABEL AND DOES NOT NEED SIGNATURE",
              fontSize: 7,
              bold: true,
              margin: [4, 6, 4, 6]
            }
          ]
        ]
      },

      layout: {
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        hLineColor: () => "#000",
        vLineColor: () => "#000",
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0
      },

      pageBreak: "after"
    }
  ];
}
// ------------------------------
// MERGE ALL LABELS INTO ONE PDF
// ------------------------------


// ------------------------------
// CREATE LABEL CONTENT ONLY
// ------------------------------
async function buildShippingLabelContent(order) {
  switch (Number(getuser()?.id)) {
    case 11:
      return await buildShippingLabel11(order);

        case 19:
      return await buildShippingLabel19(order);

    default:
      return await buildShippingLabelDefault(order);
  }
}
// ------------------------------
// USER 11 LABEL
// ------------------------------
async function buildShippingLabel11(order) {
  const defaultdata = await getdefaultdata(
    order.warehouse,
    order.orderNumber
  );

  const awbBarcode = await generateBarcodeDataURL(order.awb);

  const paymentMethod =
    order.financialStatus === "pending"
      ? "COD"
      : "Prepaid";

  const shippingAddress = [
    order.customerName,
    order.addressLine1,
    order.addressLine2,
    order.landmark,
    `${order.city || ""}, ${order.state || ""}, India`,
    order.pincode,
    `Contact : ${order.customerPhone || "-"}`
  ]
    .filter(Boolean)
    .join("\n");

  const bookedDate = new Date(
    order.processedAt || new Date()
  ).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const tableBody = [
    [
      { text: "SKU", bold: true, fontSize: 6, alignment: "center" },
      { text: "Name", bold: true, fontSize: 6, alignment: "center" },
      { text: "QTY", bold: true, fontSize: 6, alignment: "center" },
      { text: "HSN\nCode", bold: true, fontSize: 6, alignment: "center" },
      { text: "Tax", bold: true, fontSize: 6, alignment: "center" }
    ]
  ];

  order.items.forEach((item) => {
    tableBody.push([
      { text: item.sku || "-", fontSize: 5.5 },
      { text: item.name || "-", fontSize: 5.5 },
      {
        text: String(item.quantity || 1),
        alignment: "center",
        fontSize: 5.5
      },
      {
        text: item.hsn || "-",
        alignment: "center",
        fontSize: 5.5
      },
      {
        text: `${item.gstRate || 0}.00%`,
        alignment: "center",
        fontSize: 5.5
      }
    ]);
  });

  return [
    {
      table: {
        widths: ["*"],

        body: [
          [
            {
              columns: [
                {
                  width: "*",

                  stack: [
                    {
                      text: "Ship To",
                      bold: true,
                      fontSize: 8,
                      margin: [4, 3, 4, 1]
                    },

                    {
                      text: shippingAddress,
                      fontSize: 7,
                      lineHeight: 1,
                      margin: [4, 0, 4, 3]
                    }
                  ]
                },

                {
                  width: 118,

                  stack: [
                    {
                      text: order.courier || "Delhivery",
                      alignment: "center",
                      bold: true,
                      fontSize: 12,
                      margin: [5, 2, 4, 1]
                    }
                  ]
                }
              ]
            }
          ],

          [
            {
              columns: [
                {
                  width: "*",

                  stack: [
                    {
                      text: [
                        { text: "Payment : ", bold: true },
                        paymentMethod
                      ],

                      fontSize: 7,
                      margin: [4, 3, 0, 1]
                    },

                    {
                      text: [
                        { text: "AWB No. : ", bold: true },
                        order.awb || "-"
                      ],

                      fontSize: 7,
                      margin: [4, 0, 0, 1]
                    }
                  ]
                },

                {
                  width: 118,

                  stack: [
                    {
                      text: order.courier || "Delhivery",
                      alignment: "center",
                      bold: true,
                      fontSize: 8,
                      margin: [0, 2, 0, 1]
                    },

                    {
                      image: awbBarcode,
                      width: 105,
                      height: 32,
                      alignment: "center"
                    },

                    {
                      text: order.awb || "-",
                      alignment: "center",
                      bold: true,
                      fontSize: 6.5
                    }
                  ]
                }
              ]
            }
          ],

          [
            {
              text: `Booked Date: ${bookedDate}`,
              fontSize: 7,
              margin: [4, 0, 4, 4]
            }
          ],

          [
            {
              table: {
                headerRows: 1,
                widths: [42, "*", 22, 30, 25],
                body: tableBody
              },

              layout: {
                hLineWidth: () => 1,
                vLineWidth: () => 1,
                hLineColor: () => "#000",
                vLineColor: () => "#000",

                paddingLeft: () => 1,
                paddingRight: () => 1,
                paddingTop: () => 1,
                paddingBottom: () => 1
              }
            }
          ],

          [
            {
              text:
                "THIS IS AN AUTO-GENERATED LABEL AND DOES NOT NEED SIGNATURE",

              alignment: "center",

              bold: true,

              fontSize: 5.5,

              margin: [2, 4, 2, 4]
            }
          ]
        ]
      },

      layout: {
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        hLineColor: () => "#000",
        vLineColor: () => "#000",

        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0
      },

      pageBreak: "after"
    }
  ];
}
async function generateBulkShippingLabels(orderList) {
  const allContent = [];

  for (let i = 0; i < orderList.length; i++) {
    const order = orderList[i];

    const content =
      await buildShippingLabelContent(order);

    // remove page break from last label
    if (i === orderList.length - 1) {
      if (content[0]?.pageBreak) {
        delete content[0].pageBreak;
      }
    }

    allContent.push(...content);
  }

  const docDefinition = {
    pageSize: {
      width: 288,
      height: 432
    },

    pageMargins: [1, 1, 1, 1],

    defaultStyle: {
      fontSize: 7
    },

    content: allContent
  };

  pdfMake
    .createPdf(docDefinition)
    .download("Bulk_Shipping_Labels.pdf");
}



const cloneorder=async(order)=>{
  try {
    let tmporder={...order}
    delete tmporder.id
let ttt=0
    orders.forEach((element) => {
      if(element.orderNumber.includes(tmporder.orderNumber)){
        ttt++
      }
    });
    tmporder.items.forEach((element)=>{
     delete element.id
  })
    
      tmporder.orderNumber=tmporder.orderNumber+"-clone"+ttt
      tmporder.status="Pending"
    delete tmporder.awb


      const newOrder = await orderApi.mancreate([tmporder]);

    toast({ title: "Success", description: `Order cloned successfully` });
    fetchOrders(); // refresh list
  } catch (error: any) {
    toast({
      title: "Error",
      description: error.message || "Failed to clone order",
      variant: "destructive",
    });
  }
}


const trackorder=async(awb)=>{
  try {
    if(!awb){
      toast({
        title: "Error",
        description: "AWB number not available for this order",
        variant: "destructive",
      });
      return
    }
    let response =await apiRequest("GET","tracking/track/"+awb,{},{})
    // console.log(response,"trackingresponse")
    
   settrackorderdata(response?.data?.data || {})
   settrackorder_(true)


    // window.open(trackingUrl, '_blank');
  } catch (error: any) {
    toast({
      title: "Error",
      description: error.message || "Failed to track order",
      variant: "destructive",
    });
  }



  
}


useEffect(()=>{

  if(singleor){
        fungetratelist()
  }
 

},[bulkshipmentcreate.warehouselist])


function formatDate(dateString) {
 const date = new Date(dateString);

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}


console.log(formatDate("2026-05-19T16:53:37.086Z"));

const TrackingModal = ({ open, onOpenChange, trackingData }) => {
  if (!trackingData) return null;

  const {
    awbNumber,
    courier,
    status,
    from,
    to,
    estimatedDelivery,
    trackingHistory = [],
    lastUpdated,
    orderDetails = {},
  } = trackingData;

  const formatDate = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString();
  };

  const getStatusBadgeColor = (status) => {
    const lowerStatus = status?.toLowerCase() || '';
    if (lowerStatus.includes('cancel')) return 'destructive';
    if (lowerStatus.includes('delivered')) return 'success';
    if (lowerStatus.includes('processing') || lowerStatus.includes('in_process')) return 'warning';
    return 'secondary';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📦 Shipment Tracking — {awbNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic shipment info */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">AWB Number</p>
              <p className="font-medium">{awbNumber || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Courier</p>
              <p className="font-medium">{courier=="Innufill"?"Shree Maruti":courier || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant={getStatusBadgeColor(status)}>{status || '—'}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">From</p>
              <p className="font-medium">{from || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">To</p>
              <p className="font-medium">{to || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Est. Delivery</p>
              <p className="font-medium">{estimatedDelivery || 'Pending'}</p>
            </div>
          </div>

          {/* Order details */}
          {orderDetails && Object.keys(orderDetails).length > 0 && (
            <div>
              <h3 className="font-medium mb-2">🛍️ Order Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border p-3 bg-muted/20">
                <div>
                  <p className="text-xs text-muted-foreground">Order Number</p>
                  <p className="font-medium">{orderDetails.orderNumber || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Customer Name</p>
                  <p className="font-medium">{orderDetails.customerName || '—'}</p>
                </div>
                {/* <div>
                  <p className="text-xs text-muted-foreground">Customer Phone</p>
                  <p className="font-medium">{orderDetails.customerPhone || '—'}</p>
                </div> */}
              </div>
            </div>
          )}

          {/* Tracking History Timeline */}
          <div>
            <h3 className="font-medium mb-3">📋 Tracking History</h3>
            {trackingHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tracking history available.</p>
            ) : (
              <div className="space-y-4">
                {trackingHistory.map((event, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-primary mt-1.5"></div>
                      {idx !== trackingHistory.length - 1 && (
                        <div className="w-0.5 flex-1 bg-border mt-1"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{event.status || 'Unknown'}</p>
                        {event.completed !== undefined && (
                          <Badge variant={event.completed ? 'default' : 'outline'} className="text-xs">
                            {event.completed ? 'Completed' : 'Pending'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{event.description || '—'}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        📍 {event.location || 'Unknown location'}
                      </p>

                       <p className="text-xs text-muted-foreground mt-1">
                        📍 {event.timestamp ? new Date(event.timestamp).toLocaleDateString("en-GB").replace(/\//g, "-") : 'Unknown location'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Last updated */}
          {lastUpdated && (
            <div className="text-right text-xs text-muted-foreground border-t pt-3">
              Last updated: {formatDate(lastUpdated)}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Using India Post Pincode API


  return (
    <DashboardLayout hidePageHeader>
      <div className="space-y-4">
        <OrderWorkspaceToolbar
          statusFilter={statusFilter}
          onStatusChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
          direction={orderDirection}
          onDirectionChange={setOrderDirection}
          scope={orderScope}
          onScopeChange={setOrderScope}
          statusCounts={statusCounts}
          onCreateOrder={() => { setFormData({ ...emptyOrder }); setCreateOpen(true); }}
          onBulkImport={() => setUploadDialogOpen(true)}
          syncSlot={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-9 gap-1.5 bg-indigo-900 hover:bg-indigo-950 text-white font-medium" disabled={isSyncing}>
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync Orders'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => handleSync()}><RefreshCw className="mr-2 h-4 w-4" /><span>Sync All Platforms</span></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleSync('Amazon')} disabled={!isIntegrationActive('Amazon')}>
                  <ShoppingBag className="mr-2 h-4 w-4" /><span>Sync Amazon</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSync('Shopify')} disabled={!isIntegrationActive('Shopify')}>
                  <Store className="mr-2 h-4 w-4" /><span>Sync Shopify</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSync('WooCommerce')} disabled={!isIntegrationActive('WooCommerce')}>
                  <Globe className="mr-2 h-4 w-4" /><span>Sync WooCommerce</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSync('Custom')} disabled={!isIntegrationActive('Custom')}>
                  <Wifi className="mr-2 h-4 w-4" /><span>Sync Custom</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />

        <div className="lm-workspace-shell">
        <OrderFilterBar
          dateType={dateType}
          onDateTypeChange={setDateType}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          refSearch={refSearch}
          onRefSearchChange={setRefSearch}
          awbSearch={awbSearch}
          onAwbSearchChange={setAwbSearch}
          paymentFilter={paymentmood}
          onPaymentFilterChange={setpaymentmood}
          platformFilter={platformFilter}
          onPlatformFilterChange={setPlatformFilter}
          showMoreFilters={showMoreFilters}
          onToggleMoreFilters={() => setShowMoreFilters(!showMoreFilters)}
          onRefresh={() => fetchOrders(currentPage, itemsPerPage)}
          onExport={() => orderApi.export(paginatedOrders)}
          refreshing={loading}
        />

        {showMoreFilters && (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2 bg-slate-50">
            <Select value={courier__} onValueChange={setcourier__}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Courier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courier</SelectItem>
                <SelectItem value="smc">Shree Maruti</SelectItem>
                <SelectItem value="delhivery">Delhivery</SelectItem>
                <SelectItem value="amazone">Amazon</SelectItem>
                <SelectItem value="ekart">Ekart</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative w-56">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="General search..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 text-xs" />
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" disabled={isSyncing || !isIntegrationActive('Shopify')} onClick={() => setShowShopifyManualSync(true)}>
              <Store className="h-3.5 w-3.5" /> Manual Shopify Sync
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1"><Link className="h-3.5 w-3.5" /> Integrations</Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                  <SheetTitle>Platform Integrations</SheetTitle>
                  <SheetDescription>Connect your sales channels to sync orders automatically.</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  {loadingIntegrations ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    Array.isArray(integrations) && integrations.map((integration) => {
                      const Icon = platformIcons[integration.type];
                      const hasCredentials = (() => {
                        switch (integration.type) {
                          case "Amazon": return !!(integration.credentials.sellerId && integration.credentials.accessToken);
                          case "Shopify": return !!(integration.credentials.storeUrl && integration.credentials.accessToken && integration.credentials.clientid);
                          case "WooCommerce": return !!(integration.credentials.storeUrl && integration.credentials.apiKey && integration.credentials.apiSecret);
                          case "Custom": return !!(integration.credentials.storeUrl);
                          default: return false;
                        }
                      })();
                      return (
                        <Card key={integration.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${integration.isActive ? 'bg-green-500' : hasCredentials ? 'bg-yellow-500' : 'bg-gray-300'}`} />
                                <Icon className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <h4 className="font-medium">{integration.name}</h4>
                                  <p className="text-xs text-muted-foreground">{integration.isActive ? 'Connected' : hasCredentials ? 'Configured' : 'Not configured'}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => openIntegrationConfig(integration)}><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="sm" onClick={() => toggleIntegration(integration.id)}>
                                  {integration.isActive ? <Unlink className="h-4 w-4" /> : <Link className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}

        {bulkshipmentcreate.orderlist.length>0?<>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 "              >
        <div className="space-y-2">
          
          <Button variant="outline" className=" mx-2 " onClick={async(e)=>{
e.target.style.cursor="wait"
            await fungetratelist()
                setbulkcreatemodal(true)
e.target.style.cursor="pointer"

          }}>
            Assign Courier
          </Button>

          <Button variant="outline" onClick={async(e)=>{
            e.target.style.cursor="wait"
                   await generateBulkShippingLabels(
  bulkshipmentcreate.orderlist
);
            e.target.style.cursor="pointer"
          }}
          
          >
            Bulk Label Download
            
          </Button>

          <Button variant="outline" 
          
          className=" mx-2 "

          onClick={async(e)=>{
            e.target.style.cursor="wait"
                                await generateOrderPDFbulk(bulkshipmentcreate.orderlist)
            e.target.style.cursor="pointer" 
          }}>
            Bulk Invoice Download
          </Button>








          {/* <Label htmlFor="status">Courier</Label>
          <Select value={bulkshipmentcreate.coureir} onValueChange={v => setbulkshipmentcreate(f => ({ ...f, coureir: v  }))}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["eKART","-", "BlueDart", "Delhivery", "DTDC", "Ecom Express", "Xpressbees"]).map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select> */}



        </div>
        
          {checkmerge()?<div className="space-y-2"><Button variant="outline"
          
          className=" mx-2 "

          onClick={()=>{
            handleCreateMerge()
          }}  >
            Merge Order
          </Button></div>:""}
        {/* <div className="space-y-2">
           {bulkshipmentcreate.coureir!=""?<><Button  style={{ marginTop:"31px" }}onClick={() => createshipmentfuntion()} className="gap-2"><Plus className=" h-4 w-4" /> Create Shipment</Button>    &nbsp; 
           </>:""}
        </div> */}
        </div>
        </>:""
        }

                <OrdersRichTable
                  orders={paginatedOrders}
                  loading={loading}
                  selectedIds={bulkshipmentcreate.id}
                  allSelected={paginatedOrders.length > 0 && paginatedOrders.every(o => bulkshipmentcreate.id.includes(o.id))}
                  onToggleSelectAll={(checked) => {
                    if (checked) {
                      bulkshipmentcreate.id = paginatedOrders.map(o => o.id);
                      bulkshipmentcreate.orderlist = [...paginatedOrders];
                    } else {
                      bulkshipmentcreate.id = [];
                      bulkshipmentcreate.orderlist = [];
                    }
                    bulkshipmentcreate.coureir = new Array(bulkshipmentcreate.id.length).fill('');
                    bulkshipmentcreate.warehouselist = new Array(bulkshipmentcreate.id.length).fill('');
                    setbulkshipmentcreate({ ...bulkshipmentcreate });
                  }}
                  onToggleSelect={(order, checked) => {
                    if (checked) {
                      bulkshipmentcreate.id.push(order.id);
                      bulkshipmentcreate.orderlist.push(order);
                    } else {
                      bulkshipmentcreate.orderlist.splice(bulkshipmentcreate.id.indexOf(order.id), 1);
                      bulkshipmentcreate.id.splice(bulkshipmentcreate.id.indexOf(order.id), 1);
                    }
                    bulkshipmentcreate.coureir = new Array(bulkshipmentcreate.id.length).fill('');
                    bulkshipmentcreate.warehouselist = new Array(bulkshipmentcreate.id.length).fill('');
                    setbulkshipmentcreate({ ...bulkshipmentcreate });
                  }}
                  warelistbyid={warelistbyid}
                  formatDate={formatDate}
                  onAwbClick={(awb) => trackorder(awb)}
                  onAssignCourier={(order) => {
                    if (confirm("Assign courier to this order?")) {
                      bulkshipmentcreate.id.push(order.id);
                      bulkshipmentcreate.orderlist.push(order);
                      setsingleor(true);
                    } else {
                      bulkshipmentcreate.orderlist.splice(bulkshipmentcreate.id.indexOf(order.id), 1);
                      bulkshipmentcreate.id.splice(bulkshipmentcreate.id.indexOf(order.id), 1);
                      setsingleor(false);
                    }
                    bulkshipmentcreate.coureir = new Array(bulkshipmentcreate.id.length).fill("");
                    const pincodefrom = warehouselist.find((ware) => ware.isDefault) || {};
                    bulkshipmentcreate.warehouselist = new Array(bulkshipmentcreate.id.length).fill(pincodefrom.id || "");
                    setbulkshipmentcreate({ ...bulkshipmentcreate });
                  }}
                  renderActions={(order) => (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs">Action</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => setViewOrder(order)}>View Order</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(order)}>Edit Order</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => generateOrderPDF(order)}>Download Invoice</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => generateShippingLabel(order)}>Download Label</DropdownMenuItem>
                        {order.status === "Pending" && (
                          <DropdownMenuItem onClick={() => setDeleteOrder(order)}>Delete Order</DropdownMenuItem>
                        )}
                        {order.status !== "Delivered" && (
                          <DropdownMenuItem onClick={() => Shippmentcancel(order)}>Cancel Shipment</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  renderStatus={(order) =>
                    getuser().role === "admin" ? (
                      <Select value={order.status} onValueChange={(v) => handleStatusChange(order.id, v as OrderStatus)}>
                        <SelectTrigger className={`h-6 w-24 border-0 text-[10px] mt-1 ${statusStyles[order.status]} rounded-full px-2`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="In Transit">In Transit</SelectItem>
                          <SelectItem value="Delivered">Delivered</SelectItem>
                          <SelectItem value="UNDELIVERED">UNDELIVERED</SelectItem>
                          <SelectItem value="RTO In transit">RTO In transit</SelectItem>
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : null
                  }
                />
              <div className="flex items-center justify-between px-4 py-3 border-t">
  <div className="text-sm text-muted-foreground">
    Showing {startIndex + 1} to {Math.min(endIndex, totalOrdersCount || paginatedOrders.length)} of {totalOrdersCount || paginatedOrders.length} orders
  </div>
  <div className="flex items-center gap-2">
    <Button
      variant="outline"
      size="sm"
      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
      disabled={currentPage === 1}
    >
      Previous
    </Button>
    <div className="flex items-center gap-1">
      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
        let pageNum = i + 1;
        if (totalPages > 5 && currentPage > 3) {
          pageNum = currentPage - 3 + i;
          if (pageNum > totalPages) return null;
        }
        if (pageNum < 1) return null;
        return (
          <Button
            key={pageNum}
            variant={currentPage === pageNum ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentPage(pageNum)}
          >
            {pageNum}
          </Button>
        );
      })}
    </div>
    <Button
      variant="outline"
      size="sm"
      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
      disabled={currentPage === totalPages || totalPages === 0}
    >
      Next
    </Button>
  </div>
  <Select
    value={itemsPerPage.toString()}
    onValueChange={(value) => {
      setItemsPerPage(Number(value));
      setCurrentPage(1);
    }}
  >
    <SelectTrigger className="w-20">
      <SelectValue placeholder="10" />
    </SelectTrigger>
    <SelectContent>
      {[10, 25, 50, 100].map(size => (
        <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
        </div>
      </div>


<Dialog open={!!viewOrder} onOpenChange={(open) => !open && setViewOrder(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle>Order Details — {viewOrder?.orderNumber}</DialogTitle></DialogHeader>
          {viewOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div><h3 className="font-medium mb-2">Customer Information</h3><p className="text-sm"><span className="text-muted-foreground">Name:</span> 
                {viewOrder.customerName}</p><p className="text-sm">
                  <span className="text-muted-foreground">Phone:</span> {viewOrder.customerPhone}</p>{viewOrder.customerEmail && (<p className="text-sm"><span className="text-muted-foreground">Email:</span> {viewOrder.customerEmail}</p>)}</div>
                <div><h3 className="font-medium mb-2">Shipping Address</h3><p className="text-sm">{viewOrder.addressLine1}</p>{viewOrder.addressLine2 && <p className="text-sm">{viewOrder.addressLine2}</p>}
                {viewOrder.landmark && <p className="text-sm">{viewOrder.landmark}</p>}<p className="text-sm">{viewOrder.city}, {viewOrder.state} - {viewOrder.pincode}</p></div>
              </div>
              <div><h3 className="font-medium mb-3">Order Items</h3><div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left">Product</th>
                      <th className="px-4 py-2 text-right">Price</th>
                      <th className="px-4 py-2 text-right">Qty</th>
                      <th className="px-4 py-2 text-right">GST</th>
                      <th className="px-4 py-2 text-right">Total</th>
                      <th className="px-4 py-2 text-right">Dimensions</th>
                      <th className="px-4 py-2 text-right">Weight</th>
                      </tr>
                      </thead>
                      <tbody>{viewOrder.items.map((item, idx) => (<tr key={idx} className="border-t">
                        <td className="px-4 py-2">{item.name}</td>
                        <td className="px-4 py-2 text-right">₹{item.unitPrice}</td>
                        <td className="px-4 py-2 text-right">{item.quantity}</td>  
                        <td className="px-4 py-2 text-right">{item.gstRate}%</td>  
                        <td className="px-4 py-2 text-right">₹{(item.unitPrice*item.quantity)+((item.unitPrice*item.quantity)/100*item.gstRate)}</td>
                        <td className="px-4 py-2 text-right text-xs">{item.height && item.width && item.length ? `${item.height}×${item.width}×${item.length} cm` : '-'}</td>
                        <td className="px-4 py-2 text-right">{item.deadWeight ? `${item.deadWeight} kg` : '-'}{item.volumetricWeight && ` / ${item.volumetricWeight} kg (vol)`}</td></tr>))}</tbody>
                        <tfoot className="bg-muted/50">
                        <tr><td colSpan={4} className="px-4 py-2 text-right font-medium">Total:</td><td className="px-4 py-2 text-right font-medium">
                          {
                          // viewOrder.items.reduce((acc, item) => acc + (item.totalPrice+(item.totalPrice/100*item.gstRate)), 0)
                          viewOrder?.totalOutstanding>viewOrder.items.reduce((acc, item) => acc + ((item.unitPrice*item.quantity)+((item.quantity*item.unitPrice)/100*item.gstRate)), 0)?viewOrder?.totalOutstanding:viewOrder.items.reduce((acc, item) => acc + ((item.unitPrice*item.quantity)+((item.quantity*item.unitPrice)/100*item.gstRate)), 0)
                          }</td>
                          <td colSpan={2}></td></tr></tfoot></table></div></div>
              <div className="grid grid-cols-3 gap-4"><div><p className="text-xs text-muted-foreground">Seller</p><p className="font-medium">{ allsellerlistid[viewOrder.seller].name}</p></div><div><p className="text-xs text-muted-foreground">Courier</p><p className="font-medium">{viewOrder.courier}</p></div><div><p className="text-xs text-muted-foreground">AWB</p><p className="font-medium">{viewOrder.awb}</p></div><div><p className="text-xs text-muted-foreground">Platform</p><Badge className={platformColors[viewOrder.platform]}>{viewOrder.platform}</Badge></div><div><p className="text-xs text-muted-foreground">Status</p><Badge className={statusStyles[viewOrder.status]}>{viewOrder.status}</Badge></div></div>
            </div>
          )}
        </DialogContent>
      </Dialog>


<TrackingModal trackingData={trackorderdata} open={trackorder_} onOpenChange={settrackorder_} />


      <Dialog open={bulkcreatemodal || singleor} onOpenChange={(open) =>  {
        
setbulkshipmentcreate({coureir:[],orderlist:[],id:[],ratelist:{},warehouselist:[],dispatchdate:{},zone:[]})

        setbulkcreatemodal(false)
        setsingleor(false)
      }} >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle>Order Details  &nbsp;


            &nbsp;
            &nbsp;
            &nbsp;
            &nbsp;

            
            
            
                 <Button onClick={async (e) =>{ 
                  e.target.style.display="none"
                  // e.target.style.pointerEvents="none"



                  await createshipmentfuntion()


                  // e.target.style.pointerEvents="auto"
                  e.target.style.display=""




                 }
                } className="gap-2 mt-4 flex-end "><Plus className=" h-4 w-4" /> Ship Now</Button>
            
            </DialogTitle></DialogHeader>
          <div style={{maxHeight:"400px",overflowY:"auto"}}>

</div>
          <div style={{maxHeight:"400px",overflowY:"auto"}}>
          <table className="w-full">
                <thead>      
                  <tr className="border-b border-border">
                    {[<> &nbsp; &nbsp; Order ID </>,"Description", "Platform", "Destination", "Amount", "Date","Zone","warehouse","Actions"].map((h) => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead> 
                <tbody>
                  {loading ? (
                    <tr><td colSpan={10} className="py-8 text-center text-muted-foreground">Loading orders...</td></tr>
                  ) : bulkshipmentcreate.orderlist.map((order,iii) => {
                    const PlatformIcon = platformIcons[order.platform];
// bulkshipmentcreate.warehouselist[iii]=bulkshipmentcreate.warehouselist[iii] || order.warehouse 






                    return (
                      <tr key={order.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 text-sm font-medium text-foreground">
                          
                          {order.orderNumber}  
                            
                            </td>
                        <td className="py-3 px-4"><div className="text-sm">{[...order?.items?.map((val)=>val.name)].join(", ")}</div></td>

                        <td className="py-3 px-4"><Badge className={platformColors[order.platform]}><PlatformIcon className="h-3 w-3 mr-1" />{order.platform}</Badge></td>
                        <td className="py-3 px-4"><div className="text-sm">{order.city}, {order.pincode}</div></td>
                     
                        <td className="py-3 px-4 text-sm font-medium text-foreground">{order.amount}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          <input type="date" defaultValue={bulkshipmentcreate.dispatchdate[order.orderNumber] || order.orderDate} onChange={(e)=>{
                                 bulkshipmentcreate.dispatchdate[order.orderNumber]=e.target.value


                          }} />

                        </td>
                        <td className="py-3 px-4">
                          {bulkshipmentcreate.zone[iii] || tmpzone}
                        </td>
                      
                        <td className="py-3 px-4" id="wareid">
                          <div className="flex items-center gap-1">
                             <Select defaultValue={bulkshipmentcreate.warehouselist[iii]} onValueChange={async(v) => {
                              document.getElementById("gg").style.visibility="visible"
                           bulkshipmentcreate.warehouselist[iii]=v

                          //  let tmpp=warehouselist.find((vall)=>vall.id==v)
                         let response22=await handleCalculate(order,v)
                           bulkshipmentcreate.zone[iii]=tmpzone

                              await  funsettype(iii,response22)
                               setratelist({...ratelist})
                              setbulkshipmentcreate({...bulkshipmentcreate})
                               document.getElementById("gg").style.visibility="hidden"


                            }
                             }
                              
                              
                              >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem key={"null"} value={"null"}>Select Warehouse</SelectItem>
              {warehouselist.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

                           </div>
                        </td>       
     

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                             <Select value={bulkshipmentcreate.coureir[iii]} onValueChange={(v) => {
                                   bulkshipmentcreate.coureir[iii]=v


                                   console.log(bulkshipmentcreate,"asdddddddddd",v)
                                   setbulkshipmentcreate({...bulkshipmentcreate})

                            }
                             }
                              
                              
                              >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>    
                <SelectItem key={"null"} value={"null"}>Select Warehouse</SelectItem>
               
              {ratelist[order.orderNumber]?.type?.map((s,i) => (
                <SelectItem key={i} value={i}>{s}-{ratelist[order.orderNumber].rate[i]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

                           </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              </div>
        </DialogContent>
      </Dialog>





      {/* <Dialog open={createOpen || !!editOrder} onOpenChange={(open) => { if (!open) { setCreateOpen(false); setEditOrder(null); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle>{editOrder ? 'Edit Order' : 'Create New Order'}</DialogTitle></DialogHeader>
          <FormFields formData={formData}  allsellerlist={allsellerlist} setFormData={setFormData} handleItemChange={handleItemChange} addItem={addItem} removeItem={removeItem} />
          <DialogFooter><Button variant="outline" onClick={() => { setCreateOpen(false); setEditOrder(null); }}>Cancel</Button><Button onClick={editOrder ? handleUpdate : handleCreate}>{editOrder ? 'Save Changes' : 'Create Order'}</Button></DialogFooter>
        </DialogContent>
      </Dialog> */}

      <Dialog open={createOpen || !!editOrder} onOpenChange={(open) => { 
  if (!open) { 
    setCreateOpen(false); 
    setEditOrder(null);
    setFormErrors({});
  } 
}}>
  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
    <DialogHeader><DialogTitle>{editOrder ? 'Edit Order' : 'Create New Order'}</DialogTitle></DialogHeader>
    <FormFields 
      formData={formData}  
      allsellerlist={allsellerlist} 
      setFormData={setFormData} 
      handleItemChange={handleItemChange} 
      addItem={addItem} 
      removeItem={removeItem}
      errors={formErrors}
      setErrors={setFormErrors}
    />
    <DialogFooter>
      <Button variant="outline" onClick={() => { 
        setCreateOpen(false); 
        setEditOrder(null);
        setFormErrors({});
      }}>Cancel</Button>
      <Button onClick={editOrder ? handleUpdate : handleCreate}>{editOrder ? 'Save Changes' : 'Create Order'}</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

      <Dialog open={!!deleteOrder} onOpenChange={(open) => !open && setDeleteOrder(null)}>
        <DialogContent className="max-w-sm" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle>Delete Order</DialogTitle><DialogDescription>Are you sure you want to delete {deleteOrder?.orderNumber}</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setDeleteOrder(null)}>Cancel</Button><Button variant="destructive" onClick={handleDelete}>Delete</Button></DialogFooter>
        </DialogContent>
      </Dialog>



       <Dialog open={!!disputeOrder} onOpenChange={(open) => !open && setdisputeOrder(null)}>
        <DialogContent className="max-w-sm" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Dispute Order</DialogTitle><DialogDescription>Are you sure you want to dispute {disputeOrder?.orderNumber}</DialogDescription>
          </DialogHeader>

          Upload Proof *<input type="file" onChange={(e)=>{
            uploaddcoument(e)
          }}  />{proof}


 <Label htmlFor="orderNumber">Previous Weight *</Label>
          <Input 
            id="previousweight"
           defaultValue={""}
                     onBlur={(e)=>{
            sessionStorage.setItem("previousweight",e.target.value)

           }}
            placeholder=""
            autoComplete="off"
          />


          <Label htmlFor="orderNumber">Claim Weight *</Label>
          <Input 
            id="claimweight"
           defaultValue={""}
           onBlur={(e)=>{
            sessionStorage.setItem("claimweight",e.target.value)

           }}
          
            placeholder=""
            autoComplete="off"
          />
          <DialogFooter><Button variant="outline" onClick={() => setdisputeOrder(null)}>Cancel</Button><Button variant="destructive" onClick={handleDispute}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>



     

      <Dialog open={showShopifyManualSync} onOpenChange={setShowShopifyManualSync}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual Shopify Sync</DialogTitle>
            <DialogDescription>Select date range to sync Shopify orders.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="shopifySyncFromDate">From Date</Label>
              <Input
                id="shopifySyncFromDate"
                type="date"
                value={shopifySyncFromDate}
                onChange={(e) => setShopifySyncFromDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shopifySyncToDate">To Date</Label>
              <Input
                id="shopifySyncToDate"
                type="date"
                value={shopifySyncToDate}
                onChange={(e) => setShopifySyncToDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShopifyManualSync(false)}>Cancel</Button>
            <Button onClick={handleManualShopifySync} disabled={isSyncing || !isIntegrationActive('Shopify')}>
              {isSyncing ? "Syncing..." : "Sync Shopify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSyncResults} onOpenChange={setShowSyncResults}>
        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Sync Results</DialogTitle>
            <DialogDescription>{lastSyncTime && `Last synced: ${lastSyncTime}`}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">{syncResults.map((result, index) => (<div key={index} className={`p-3 rounded-lg ${result ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">{result ? <CheckCircle className="h-4 w-4 text-green-500" /> :
             <XCircle className="h-4 w-4 text-red-500" />}
             {/* <span className="font-medium">{result.platform}
             </span> */}
             </div><Badge variant={result ? 'default' : 'destructive'}>{result ? 'Success' : 'Failed'}</Badge></div>
             {/* <p className="text-sm mt-2">Orders synced: {result.ordersSynced}</p> */}
             </div>))}</div>
          <DialogFooter><Button onClick={() => setShowSyncResults(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={createOpen__} onOpenChange={setCreateOpen__}   >
              <DialogContent>
                <DialogHeader>
                 
                </DialogHeader>
                <div className="flex ">
                <div id="fileopen" className="flex-grid" style={{maxHeight:"70vh",overflowY:"auto"}}>
      
                </div>



                 <div id="fileopen1" className="flex-grid" style={{maxHeight:"70vh",overflowY:"auto"}}>
      
                </div>
                </div>
                
                
              </DialogContent>
            </Dialog>
      <IntegrationConfigDialog integration={selectedIntegration} open={showIntegrationConfig} onOpenChange={setShowIntegrationConfig} onSave={handleSaveIntegration} onTestConnection={handleTestConnection} />
   
   
   {/* Excel Upload Dialog */}
<Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Bulk Order Upload (Excel/CSV)</DialogTitle>
      <DialogDescription>
        Upload an Excel (.xlsx, .xls) or CSV file with your orders.
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <Input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => {
            if (e.target.files?.[0]) handleUploadFile(e.target.files[0]);
          }}
          className="flex-1"
        />
        <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
          <Download className="h-4 w-4" /> Download Template
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        <strong>Instructions:</strong> Each row = one product line. Rows with same Order Number will be merged into one order.
        Required columns: Order Number, Customer Name, Customer Phone, Pincode, City, State, Address Line 1, Product Name, Quantity, Unit Price.
        Optional: GST Rate (%) (default 18%), Height/Width/Length (cm), Dead Weight (kg), Payment Method (COD/Prepaid), Platform, Courier, etc.
      </p>

      {uploadProcessing && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2">Processing...</span>
        </div>
      )}

      {uploadErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc pl-4 space-y-1">
              {uploadErrors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {uploadPreview.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Preview ({uploadPreview.length} orders)</h4>
          <div className="border rounded-md overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left">Order #</th>
                  <th className="px-3 py-2 text-left">Customer</th>
                  <th className="px-3 py-2 text-left">Items</th>
                  <th className="px-3 py-2 text-left">Total</th>
                </tr>
              </thead>
              <tbody>
                {uploadPreview.map((order, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{order.orderNumber}</td>
                    <td className="px-3 py-2">{order.customerName}<br/><span className="text-xs text-muted-foreground">{order.customerPhone}</span></td>
                    <td className="px-3 py-2">
                      {order.items.map((item: any, i: number) => (
                        <div key={i}>{item.name} x{item.quantity}</div>
                      ))}
                    </td>
                    <td className="px-3 py-2">{order.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
      <Button onClick={handleUploadConfirm} disabled={uploadPreview.length === 0 || uploadProcessing}>
        Create {uploadPreview.length} Orders
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
    </DashboardLayout>
  );
};

export default OrdersPage;
