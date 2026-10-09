import { PermissionsAndroid, Platform, Alert, Share as RNShare } from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { Order, OrderItemDetail } from '../store/orderStore';
import { apiFetch } from './api';

interface ParsedInvoiceItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

/**
 * Parses order items from order object or product_details string
 */
export function getParsedInvoiceItems(order: Order): ParsedInvoiceItem[] {
  if (order.items && order.items.length > 0) {
    return order.items.map((it) => {
      const q = it.quantity || 1;
      const p = it.price || 0;
      return {
        name: it.name || 'Item',
        quantity: q,
        price: p,
        total: q * p,
      };
    });
  }

  // Parse product_details string if items array is absent
  const detailsStr = order.product_details || 'Order Item';
  const rawParts = detailsStr.split(/,|\n|\u2022|;/).map((s) => s.trim()).filter(Boolean);

  if (rawParts.length === 0) {
    return [
      {
        name: 'Order Item',
        quantity: 1,
        price: order.amount || 0,
        total: order.amount || 0,
      },
    ];
  }

  // Try parsing items like "Organic A2 Milk 1L (x2)" or "2 x Fresh Avocados - ₹180"
  const parsedItems: ParsedInvoiceItem[] = [];
  let calculatedSum = 0;

  rawParts.forEach((part) => {
    let qty = 1;
    let name = part;
    let price = 0;

    // Check quantity pattern like (x2) or 2x
    const qtyMatch = part.match(/\(x(\d+)\)/i) || part.match(/^(\d+)\s*x\s+/i);
    if (qtyMatch) {
      qty = parseInt(qtyMatch[1], 10) || 1;
      name = part.replace(/\(x\d+\)/i, '').replace(/^\d+\s*x\s+/i, '').trim();
    }

    // Check price pattern inside item string like ₹180 or Rs. 180
    const priceMatch = part.match(/(?:₹|Rs\.?)\s*(\d+(?:\.\d+)?)/i);
    if (priceMatch) {
      price = parseFloat(priceMatch[1]) || 0;
      name = name.replace(/(?:₹|Rs\.?)\s*\d+(?:\.\d+)?/i, '').trim();
    }

    const itemTotal = qty * (price > 0 ? price : 0);
    calculatedSum += itemTotal;

    parsedItems.push({
      name: name || 'Item',
      quantity: qty,
      price: price > 0 ? price : 0,
      total: itemTotal,
    });
  });

  // If parsed prices don't sum up to order.amount, distribute price proportionally or set estimate
  if (calculatedSum === 0 && parsedItems.length > 0) {
    const avgPrice = Math.round(order.amount / parsedItems.length);
    parsedItems.forEach((it) => {
      it.price = Math.round(avgPrice / it.quantity);
      it.total = it.price * it.quantity;
    });
  }

  return parsedItems;
}

/**
 * Generates clean HTML template for PDF rendering
 */
export function generateInvoiceHTML(order: Order): string {
  const orderNum = order.order_number || order.id || 'CONNECT-001';
  const orderDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const items = getParsedInvoiceItems(order);

  const itemTotal = items.reduce((sum, i) => sum + i.total, 0) || order.amount;
  const deliveryFee = order.delivery_fee ?? 0;
  const discount = order.discount ?? 0;
  const tax = order.tax ?? 0;
  const grandTotal = order.amount || itemTotal + deliveryFee + tax - discount;

  const categoryName = order.category || 'Order';
  const customerName = order.customer_name || 'Valued Customer';
  const customerPhone = order.customer_phone || '';
  const customerAddress = order.customer_address || 'Customer Delivery Location';
  const sellerName =
    order.vendor_name ||
    order.brand_or_seller ||
    order.provider_name ||
    order.operator_name ||
    'Connect Authorized Merchant';
  const paymentMethod = order.payment_method || 'Online UPI / Card';
  const paymentStatus = order.payment_status || 'Paid';
  const orderStatus = (order.status || 'CONFIRMED').toUpperCase();

  const isBusOrder =
    String(order.category || '').toLowerCase().includes('travel') ||
    String(order.category || '').toLowerCase().includes('bus') ||
    Boolean(order.boarding_point || order.allocated_seat || order.seat || (order as any).bus_name);

  let allocatedSeat = '';
  if (order.allocated_seat && !String(order.allocated_seat).toLowerCase().includes('pending') && !String(order.allocated_seat).toLowerCase().includes('awaiting')) {
    allocatedSeat = String(order.allocated_seat).trim();
  } else if (order.seat && !String(order.seat).toLowerCase().includes('pending') && !String(order.seat).toLowerCase().includes('awaiting')) {
    allocatedSeat = String(order.seat).trim();
  } else if (Array.isArray(order.travelers) && order.travelers[0]?.seat) {
    const s = String(order.travelers[0].seat).trim();
    if (!s.toLowerCase().includes('pending') && !s.toLowerCase().includes('awaiting')) {
      allocatedSeat = s;
    }
  }

  const isSeatAllocated = Boolean(allocatedSeat);
  const busName = (order as any).bus_name || order.product_details?.split('•')?.[0]?.trim() || 'Intercity Bus';
  const boardingPoint = (order as any).boarding_point || 'Boarding Point';
  const droppingPoint = (order as any).dropping_point || 'Dropping Point';

  const itemRowsHtml = items
    .map(
      (item, idx) => `
    <tr style="background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
      <td style="padding: 12px 14px; border-bottom: 1px solid #E2E8F0; color: #0F172A; font-weight: 600;">
        ${item.name}
      </td>
      <td style="padding: 12px 14px; border-bottom: 1px solid #E2E8F0; color: #475569; text-align: center;">
        ${item.quantity}
      </td>
      <td style="padding: 12px 14px; border-bottom: 1px solid #E2E8F0; color: #475569; text-align: right;">
        &#8377;${(item?.price ?? 0).toLocaleString('en-IN')}
      </td>
      <td style="padding: 12px 14px; border-bottom: 1px solid #E2E8F0; color: #0F172A; font-weight: 700; text-align: right;">
        &#8377;${(item?.total ?? 0).toLocaleString('en-IN')}
      </td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice #${orderNum}</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #0F172A;
      background-color: #FFFFFF;
      margin: 0;
      padding: 24px;
      font-size: 13px;
      line-height: 1.5;
    }
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      border: 1px solid #CBD5E1;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .invoice-header {
      background: linear-gradient(135deg, #0B132B 0%, #1E293B 100%);
      color: #FFFFFF;
      padding: 24px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: 1px;
      color: #F5B800;
      margin: 0;
    }
    .brand-sub {
      font-size: 11px;
      color: #94A3B8;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .invoice-badge {
      background-color: #10B981;
      color: #FFFFFF;
      font-weight: 800;
      font-size: 11px;
      padding: 4px 12px;
      border-radius: 20px;
      display: inline-block;
      margin-top: 6px;
      text-transform: uppercase;
    }
    .info-grid {
      display: table;
      width: 100%;
      table-layout: fixed;
      padding: 20px 28px;
      background-color: #F8FAFC;
      border-bottom: 1px solid #E2E8F0;
    }
    .info-col {
      display: table-cell;
      vertical-align: top;
      width: 50%;
    }
    .info-label {
      font-size: 11px;
      font-weight: 800;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .info-value {
      font-size: 13px;
      color: #0F172A;
      font-weight: 600;
      margin-bottom: 3px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 0;
    }
    .items-table th {
      background-color: #F1F5F9;
      color: #475569;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 12px 14px;
      border-bottom: 2px solid #CBD5E1;
      text-align: left;
    }
    .summary-section {
      padding: 20px 28px;
      background-color: #FFFFFF;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 13px;
      color: #475569;
    }
    .summary-row.total {
      border-top: 2px solid #0F172A;
      padding-top: 12px;
      margin-top: 8px;
      font-size: 16px;
      font-weight: 900;
      color: #0F172A;
    }
    .free-text {
      color: #10B981;
      font-weight: 800;
    }
    .footer-note {
      text-align: center;
      padding: 16px 28px;
      background-color: #F8FAFC;
      border-top: 1px solid #E2E8F0;
      color: #64748B;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="invoice-header">
      <div>
        <h1 class="brand-title">CONNECT APP</h1>
        <div class="brand-sub">TAX INVOICE & RECEIPT</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 18px; font-weight: 800; color: #FFFFFF;">INVOICE #${orderNum}</div>
        <div style="font-size: 12px; color: #CBD5E1;">Date: ${orderDate}</div>
        <span class="invoice-badge">${orderStatus}</span>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-col">
        <div class="info-label">Customer Details</div>
        <div class="info-value">${customerName}</div>
        <div class="info-value" style="color: #475569;">${customerPhone}</div>
        <div class="info-value" style="color: #475569; font-size: 12px;">${customerAddress}</div>
      </div>
      <div class="info-col" style="padding-left: 20px;">
        <div class="info-label">Order Metadata</div>
        <div class="info-value">Category: ${categoryName}</div>
        <div class="info-value">Merchant: ${sellerName}</div>
        <div class="info-value">Payment: ${paymentMethod} (${paymentStatus})</div>
      </div>
    </div>

    ${
      isBusOrder
        ? `
    <div style="margin: 18px 28px 18px; padding: 16px 20px; border-radius: 12px; background: ${
      isSeatAllocated ? '#F0FDF4' : '#FFFBEB'
    }; border: 1.5px solid ${isSeatAllocated ? '#86EFAC' : '#FDE68A'};">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 13px; font-weight: 900; color: ${
          isSeatAllocated ? '#15803D' : '#B45309'
        }; text-transform: uppercase; letter-spacing: 0.5px;">
          &#128652; BUS E-TICKET &amp; BOARDING PASS
        </span>
        <span style="background-color: ${
          isSeatAllocated ? '#16A34A' : '#D97706'
        }; color: #FFFFFF; font-weight: 800; font-size: 11px; padding: 3px 10px; border-radius: 14px; text-transform: uppercase;">
          ${isSeatAllocated ? '&#10003; SEAT ALLOCATED' : '&#9203; SEAT PENDING'}
        </span>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <div>
          <div style="font-size: 15px; font-weight: 900; color: #0F172A;">${busName}</div>
          <div style="font-size: 12px; color: #475569; margin-top: 2px;">Route: <b>${boardingPoint}</b> &rarr; <b>${droppingPoint}</b></div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 11px; font-weight: 800; color: #64748B; text-transform: uppercase;">Seat Status</div>
          <div style="font-size: 14px; font-weight: 900; color: ${isSeatAllocated ? '#15803D' : '#D97706'};">
            ${isSeatAllocated ? `CONFIRMED (Seat: ${allocatedSeat})` : 'Pending Allocation'}
          </div>
        </div>
      </div>

      <div style="font-size: 11.5px; color: ${
        isSeatAllocated ? '#166534' : '#92400E'
      }; background: ${isSeatAllocated ? '#DCFCE7' : '#FEF3C7'}; padding: 8px 12px; border-radius: 8px;">
        ${
          isSeatAllocated
            ? `&#10003; Your allocated seat is <b>${allocatedSeat}</b>. Present this E-ticket upon boarding.`
            : '&#9203; Operator is currently reviewing and allocating seats. Once assigned, your seat number will automatically reflect here.'
        }
      </div>
    </div>
    `
        : ''
    }

    <table class="items-table">
      <thead>
        <tr>
          <th>Item Description</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Unit Price</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRowsHtml}
      </tbody>
    </table>

    <div class="summary-section">
      <div style="max-width: 320px; margin-left: auto;">
        <div class="summary-row">
          <span>Item Subtotal</span>
          <span>&#8377;${(itemTotal ?? 0).toLocaleString('en-IN')}</span>
        </div>
        <div class="summary-row">
          <span>Delivery Fee</span>
          <span class="${deliveryFee === 0 ? 'free-text' : ''}">
            ${deliveryFee === 0 ? 'FREE' : '&#8377;' + (deliveryFee ?? 0).toLocaleString('en-IN')}
          </span>
        </div>
        ${
          discount > 0
            ? `
        <div class="summary-row" style="color: #10B981;">
          <span>Discount Applied</span>
          <span>-&#8377;${(discount ?? 0).toLocaleString('en-IN')}</span>
        </div>
        `
            : ''
        }
        ${
          tax > 0
            ? `
        <div class="summary-row">
          <span>GST / Tax</span>
          <span>&#8377;${(tax ?? 0).toLocaleString('en-IN')}</span>
        </div>
        `
            : ''
        }
        <div class="summary-row total">
          <span>Total Paid</span>
          <span style="color: #0F172A;">&#8377;${(grandTotal ?? 0).toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>

    <div class="footer-note">
      Thank you for ordering with Connect App! For support or queries, contact support@connectapp.in.
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Request storage permissions on Android
 */
export async function requestStoragePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    // Android 13+ (API 33+) does not need WRITE_EXTERNAL_STORAGE for app-specific or public download dirs
    if (Platform.Version >= 33) {
      return true;
    }

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: 'Storage Permission Required',
        message: 'Connect Mobile needs storage access to save the PDF invoice to your Downloads folder.',
        buttonPositive: 'Grant Permission',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('Storage permission error:', err);
    return true;
  }
}

/**
 * Generates a valid pure-JS minimal PDF document if backend is temporarily unreachable
 */
function generateFallbackPdf(order: Order): string {
  const orderNum = (order.order_number || order.id || 'CONNECT-001').replace(/[^a-zA-Z0-9_-]/g, '');
  const orderDate = new Date().toLocaleDateString('en-IN');
  const customer = order.customer_name || 'Valued Customer';
  const seller =
    order.vendor_name ||
    order.brand_or_seller ||
    order.provider_name ||
    'Connect Authorized Merchant';
  const total = order.amount || 0;
  const status = (order.status || 'CONFIRMED').toUpperCase();
  const payment = order.payment_method || 'Online UPI / Card';

  const isBusOrder =
    String(order.category || '').toLowerCase().includes('travel') ||
    String(order.category || '').toLowerCase().includes('bus') ||
    Boolean(order.boarding_point || order.allocated_seat || order.seat || (order as any).bus_name);

  let allocatedSeat = '';
  if (order.allocated_seat && !String(order.allocated_seat).toLowerCase().includes('pending') && !String(order.allocated_seat).toLowerCase().includes('awaiting')) {
    allocatedSeat = String(order.allocated_seat).trim();
  } else if (order.seat && !String(order.seat).toLowerCase().includes('pending') && !String(order.seat).toLowerCase().includes('awaiting')) {
    allocatedSeat = String(order.seat).trim();
  } else if (Array.isArray(order.travelers) && order.travelers[0]?.seat) {
    const s = String(order.travelers[0].seat).trim();
    if (!s.toLowerCase().includes('pending') && !s.toLowerCase().includes('awaiting')) {
      allocatedSeat = s;
    }
  }

  const lines = [
    'CONNECT APP - TAX INVOICE & RECEIPT',
    '==================================================',
    `Invoice Number : #${orderNum}`,
    `Order Date     : ${orderDate}`,
    `Order Status   : ${status}`,
    `Payment Method : ${payment} (PAID)`,
    `Seller         : ${seller}`,
    `Customer       : ${customer}`,
    ...(isBusOrder
      ? [
          '--------------------------------------------------',
          'BUS TRAVEL & SEAT STATUS:',
          `  * Bus Name     : ${(order as any).bus_name || 'Intercity Bus'}`,
          `  * Seat Status  : ${allocatedSeat ? `CONFIRMED (SEAT ${allocatedSeat})` : 'PENDING OPERATOR ALLOCATION'}`,
        ]
      : []),
    '--------------------------------------------------',
    'ITEMS:',
    `  * ${(order.product_details || 'Order Item').substring(0, 70)}`,
    '--------------------------------------------------',
    `TOTAL PAID     : Rs. ${total}`,
    '==================================================',
    'Thank you for ordering with Connect App!',
    'Support & Queries: support@connectapp.in',
  ];

  let stream = 'BT\n/F1 11 Tf\n50 780 Td\n18 TL\n';
  lines.forEach((l) => {
    const esc = l.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    stream += `(${esc}) Tj\nT*\n`;
  });
  stream += 'ET\n';

  const len = stream.length;
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];

  function addObj(str: string) {
    offsets.push(pdf.length);
    pdf += str + '\n';
  }

  addObj('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  addObj('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');
  addObj('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj');
  addObj('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj');
  addObj(`5 0 obj\n<< /Length ${len} >>\nstream\n${stream}endstream\nendobj`);

  const startxref = pdf.length;
  pdf += 'xref\n0 6\n0000000000 65535 f \n';
  offsets.forEach((off) => {
    pdf += String(off).padStart(10, '0') + ' 00000 n \n';
  });
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF`;
  return pdf;
}

/**
 * Generates genuine PDF invoice file and saves to local storage & Downloads folder
 */
export async function generateAndSaveInvoicePDF(order: Order): Promise<string | null> {
  const orderNum = (order.order_number || order.id || 'ORDER').replace(/[^a-zA-Z0-9_-]/g, '');
  const fileName = `Invoice_${orderNum}`;

  try {
    let pdfBase64: string | null = null;

    // 1. Request official PDF generated by backend PDFKit
    try {
      const res: any = await apiFetch('/orders/generate-invoice-pdf', {
        method: 'POST',
        body: { order },
        skipCache: true,
      });
      if (res && res.success && res.base64) {
        pdfBase64 = res.base64;
      }
    } catch (apiErr) {
      console.log('[InvoiceService] Backend PDF generation fetch failed, will use fallback:', apiErr);
    }

    // 2. Primary safe write to app documents directory
    const docPath = `${RNFS.DocumentDirectoryPath}/${fileName}.pdf`;
    if (pdfBase64) {
      await RNFS.writeFile(docPath, pdfBase64, 'base64');
    } else {
      const fallbackPdf = generateFallbackPdf(order);
      await RNFS.writeFile(docPath, fallbackPdf, 'utf8');
    }

    let targetPath = docPath;

    // 3. Also save/copy to public Downloads folder if accessible on Android
    if (Platform.OS === 'android') {
      try {
        const downloadsDir = RNFS.DownloadDirectoryPath || `${RNFS.ExternalStorageDirectoryPath}/Download`;
        const downloadFilePath = `${downloadsDir}/${fileName}.pdf`;
        if (pdfBase64) {
          await RNFS.writeFile(downloadFilePath, pdfBase64, 'base64');
        } else {
          await RNFS.copyFile(docPath, downloadFilePath);
        }
        targetPath = downloadFilePath;

        // Scan file so Android Files/Downloads apps detect it immediately
        if (typeof (RNFS as any).scanFile === 'function') {
          await (RNFS as any).scanFile(downloadFilePath).catch(() => {});
        }
      } catch (scopedStorageErr) {
        console.log('[InvoiceService] Direct Download directory write redirected to Documents folder:', scopedStorageErr);
      }
    }

    return targetPath;
  } catch (err: any) {
    console.error('Failed to generate invoice PDF file:', err);
    Alert.alert('Error', 'Unable to generate invoice PDF: ' + (err.message || String(err)));
    return null;
  }
}

/**
 * Downloads invoice and triggers system file saving / opening
 */
export async function downloadInvoicePDF(order: Order): Promise<string | null> {
  const filePath = await generateAndSaveInvoicePDF(order);

  if (filePath) {
    const shareUrl = filePath.startsWith('file://') ? filePath : `file://${filePath}`;

    try {
      await Share.open({
        url: shareUrl,
        type: 'application/pdf',
        saveToFiles: true,
        title: `Save Invoice #${order.order_number || order.id}`,
        subject: `Invoice #${order.order_number || order.id}`,
        failOnCancel: false,
      });
    } catch (err: any) {
      if (err && err.message !== 'User did not share') {
        console.warn('Save to device share error:', err);
      }
    }
  }
  return filePath;
}

/**
 * Shares invoice PDF file directly
 */
export async function shareInvoicePDF(order: Order, existingFilePath?: string): Promise<void> {
  try {
    let filePath = existingFilePath;
    if (!filePath || !(await RNFS.exists(filePath))) {
      filePath = (await generateAndSaveInvoicePDF(order)) || undefined;
    }

    if (filePath && (await RNFS.exists(filePath))) {
      const shareUrl = filePath.startsWith('file://') ? filePath : `file://${filePath}`;

      await Share.open({
        url: shareUrl,
        type: 'application/pdf',
        title: `Invoice #${order.order_number || order.id}`,
        subject: `Connect App Invoice #${order.order_number || order.id}`,
      });
    } else {
      // Fallback standard text share if file creation fails
      await RNShare.share({
        message: `Connect App Order Invoice #${order?.order_number || order?.id}\nItems: ${order?.product_details}\nTotal Paid: ₹${(order?.amount ?? 0).toLocaleString('en-IN')}\nStatus: ${order?.status}`,
      });
    }
  } catch (err: any) {
    if (err && err.message !== 'User did not share') {
      console.warn('Share error:', err);
    }
  }
}
