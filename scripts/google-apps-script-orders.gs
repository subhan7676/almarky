/**
 * Almarky Order Webhook for Google Apps Script
 *
 * Script Properties (optional):
 * - ALMARKY_SHARED_SECRET
 * - ALMARKY_ORDERS_FOLDER_ID
 * - ALMARKY_MASTER_SHEET_ID
 * - ALMARKY_MASTER_SHEET_TAB (default: Orders)
 * - ALMARKY_CONTACT_EMAIL (default: almarkycustomerservice@gmail.com)
 * - ALMARKY_CONTACT_SHEET_TAB (default: ContactMessages)
 */

function jsonResponse(payload, statusCode) {
  var output = ContentService.createTextOutput(JSON.stringify(payload));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function getConfig() {
  var props = PropertiesService.getScriptProperties();
  return {
    sharedSecret: props.getProperty("ALMARKY_SHARED_SECRET") || "",
    ordersFolderId: props.getProperty("ALMARKY_ORDERS_FOLDER_ID") || "",
    masterSheetId: props.getProperty("ALMARKY_MASTER_SHEET_ID") || "",
    masterSheetTab: props.getProperty("ALMARKY_MASTER_SHEET_TAB") || "Orders",
    contactEmail:
      props.getProperty("ALMARKY_CONTACT_EMAIL") ||
      "almarkycustomerservice@gmail.com",
    contactSheetTab:
      props.getProperty("ALMARKY_CONTACT_SHEET_TAB") || "ContactMessages",
  };
}

function requireString(value) {
  return (value || "").toString().trim();
}

function safeNumber(value) {
  var n = Number(value);
  if (!isFinite(n) || isNaN(n)) return 0;
  return n;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function validateRequestBody(body) {
  if (!body) return "Missing JSON body.";
  if (!requireString(body.orderId)) return "Missing orderId.";
  if (!requireString(body.orderNumber)) return "Missing orderNumber.";
  if (!body.customerDetails) return "Missing customerDetails.";
  if (!ensureArray(body.items).length) return "Missing order items.";
  return "";
}

function validateContactBody(body) {
  if (!body) return "Missing JSON body.";
  if (!requireString(body.fullName)) return "Missing fullName.";
  if (!requireString(body.email)) return "Missing email.";
  if (!requireString(body.subject)) return "Missing subject.";
  if (!requireString(body.message)) return "Missing message.";
  return "";
}

function buildRows(payload) {
  var customer = payload.customerDetails || {};
  var pricing = payload.pricing || {};
  var rows = [
    ["ALMARKY ORDER"],
    ["Order Number", requireString(payload.orderNumber)],
    ["Order ID", requireString(payload.orderId)],
    ["Created At", requireString(payload.createdAt)],
    ["User UID", requireString(payload.uid)],
    ["User Email", requireString(payload.email) || "N/A"],
    [],
    ["Customer Details"],
    ["Full Name", requireString(customer.fullName)],
    ["Phone", requireString(customer.phonePk)],
    ["Province", requireString(customer.province)],
    ["City", requireString(customer.city)],
    ["Tehsil", requireString(customer.tehsil)],
    ["District", requireString(customer.district)],
    ["House Address", requireString(customer.houseAddress)],
    ["Shop Name", requireString(customer.shopName) || "N/A"],
    [],
    ["Items"],
    ["#", "Product Name", "Product ID", "Color", "Quantity", "Unit Price", "Delivery Fee", "Line Total"],
  ];

  ensureArray(payload.items).forEach(function(item, index) {
    rows.push([
      index + 1,
      requireString(item.name),
      requireString(item.productId),
      requireString(item.color),
      safeNumber(item.quantity),
      safeNumber(item.unitPrice),
      safeNumber(item.deliveryFee),
      safeNumber(item.lineTotal),
    ]);
  });

  rows.push([]);
  rows.push(["Subtotal", safeNumber(pricing.subtotal)]);
  rows.push(["Delivery Total", safeNumber(pricing.deliveryTotal)]);
  rows.push(["Grand Total", safeNumber(pricing.grandTotal)]);
  return rows;
}

function normalizeRowsForSheet(rows) {
  var maxCols = rows.reduce(function(max, row) {
    return Math.max(max, ensureArray(row).length);
  }, 1);

  var normalizedRows = rows.map(function(row) {
    var next = ensureArray(row).slice();
    while (next.length < maxCols) {
      next.push("");
    }
    return next;
  });

  return {
    rows: normalizedRows,
    maxCols: maxCols,
  };
}

function appendMasterLog(config, payload, spreadsheetUrl) {
  if (!config.masterSheetId) return false;
  var ss = SpreadsheetApp.openById(config.masterSheetId);
  var tab = ss.getSheetByName(config.masterSheetTab) || ss.insertSheet(config.masterSheetTab);
  var customer = payload.customerDetails || {};
  var pricing = payload.pricing || {};
  tab.appendRow([
    requireString(payload.createdAt),
    requireString(payload.orderNumber),
    requireString(payload.orderId),
    requireString(payload.uid),
    requireString(payload.email),
    requireString(customer.fullName),
    requireString(customer.phonePk),
    requireString(customer.province),
    requireString(customer.city),
    requireString(customer.tehsil),
    requireString(customer.district),
    requireString(customer.houseAddress),
    requireString(customer.shopName),
    safeNumber(pricing.subtotal),
    safeNumber(pricing.deliveryTotal),
    safeNumber(pricing.grandTotal),
    spreadsheetUrl,
  ]);
  return true;
}

function appendContactLog(config, payload) {
  if (!config.masterSheetId) return false;
  var ss = SpreadsheetApp.openById(config.masterSheetId);
  var tab = ss.getSheetByName(config.contactSheetTab) || ss.insertSheet(config.contactSheetTab);
  tab.appendRow([
    requireString(payload.submittedAt) || new Date().toISOString(),
    requireString(payload.fullName),
    requireString(payload.email),
    requireString(payload.phonePk),
    requireString(payload.subject),
    requireString(payload.message),
    requireString(payload.source) || "almarky-web",
  ]);
  return true;
}

function sendContactEmail(config, payload) {
  var receiver = requireString(payload.to) || requireString(config.contactEmail);
  if (!receiver) {
    throw new Error("Contact receiver email is not configured.");
  }

  var submittedAt = requireString(payload.submittedAt) || new Date().toISOString();
  var fullName = requireString(payload.fullName);
  var senderEmail = requireString(payload.email);
  var subject = requireString(payload.subject);
  var message = requireString(payload.message);
  var phonePk = requireString(payload.phonePk) || "N/A";
  var source = requireString(payload.source) || "almarky-web";

  var textBody = [
    "New contact message from Almarky website",
    "",
    "Submitted At: " + submittedAt,
    "Name: " + fullName,
    "Email: " + senderEmail,
    "Phone: " + phonePk,
    "Subject: " + subject,
    "Source: " + source,
    "",
    "Message:",
    message,
  ].join("\n");

  MailApp.sendEmail({
    to: receiver,
    subject: "[Almarky Contact] " + subject,
    body: textBody,
    replyTo: senderEmail || undefined,
    name: "Almarky Contact Form",
  });

  var logged = appendContactLog(config, payload);
  return {
    ok: true,
    message: "Contact message sent successfully.",
    to: receiver,
    logged: logged,
  };
}

function moveSpreadsheetToFolder(config, spreadsheetFile) {
  if (!config.ordersFolderId) return;
  var folder = DriveApp.getFolderById(config.ordersFolderId);
  folder.addFile(spreadsheetFile);
  DriveApp.getRootFolder().removeFile(spreadsheetFile);
}

function doPost(e) {
  try {
    var config = getConfig();

    if (config.sharedSecret) {
      var provided = "";
      if (e && e.parameter && e.parameter.secret) {
        provided = e.parameter.secret;
      }
      if (!provided || provided !== config.sharedSecret) {
        return jsonResponse(
          {
            ok: false,
            message:
              "Shared secret missing or invalid. Add ?secret=... in endpoint or disable ALMARKY_SHARED_SECRET.",
          },
          401,
        );
      }
    }

    var body = null;
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    if (body && requireString(body.type).toLowerCase() === "contact") {
      var contactError = validateContactBody(body);
      if (contactError) {
        return jsonResponse({ ok: false, message: contactError }, 400);
      }
      return jsonResponse(sendContactEmail(config, body), 200);
    }

    var orderValidationError = validateRequestBody(body);
    if (orderValidationError) {
      return jsonResponse({ ok: false, message: orderValidationError }, 400);
    }

    var title = "Almarky Order " + requireString(body.orderNumber);
    var sheetFile = SpreadsheetApp.create(title);
    var spreadsheet = SpreadsheetApp.openById(sheetFile.getId());
    var sheet = spreadsheet.getSheets()[0];
    var rows = buildRows(body);
    var normalized = normalizeRowsForSheet(rows);
    sheet.setName("Order");
    sheet
      .getRange(1, 1, normalized.rows.length, normalized.maxCols)
      .setValues(normalized.rows);
    sheet.autoResizeColumns(1, normalized.maxCols);

    moveSpreadsheetToFolder(config, DriveApp.getFileById(sheetFile.getId()));
    var sheetUrl = spreadsheet.getUrl();
    var masterLogged = appendMasterLog(config, body, sheetUrl);

    return jsonResponse({
      ok: true,
      orderSheetId: sheetFile.getId(),
      orderSheetUrl: sheetUrl,
      masterLogged: masterLogged,
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        message: error && error.message ? error.message : String(error),
      },
      500,
    );
  }
}

function doGet() {
  return jsonResponse({
    ok: true,
    message: "Almarky order webhook is running.",
    timestamp: new Date().toISOString(),
  });
}
