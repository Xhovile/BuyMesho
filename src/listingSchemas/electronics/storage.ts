import type { ListingItemSchema, ListingFieldGroup } from "../core.js";

export const USB_FLASH_DRIVE_SCHEMA: ListingItemSchema = {
  category: "Electronics & Gadgets",
  subcategory: "Storage & Accessories",
  itemType: "USB Flash Drive",
  fields: [
    // Device Identity
    {
      key: "brand",
      label: "Brand",
      type: "select",
      required: true,
      options: [
        "SanDisk",
        "Kingston",
        "HP",
        "Samsung",
        "Sony",
        "Transcend",
        "PNY",
        "Lexar",
        "Toshiba",
        "Other"
      ]
    },
    {
      key: "model",
      label: "Model",
      type: "text",
      required: true,
      placeholder: "e.g. SanDisk Ultra Flair, Kingston DataTraveler"
    },
    {
      key: "color",
      label: "Color",
      type: "text",
      advanced: true,
      placeholder: "e.g. Black, Silver, Blue"
    },
    {
      key: "capacity",
      label: "Storage Capacity",
      type: "select",
      required: true,
      options: [
        "4GB",
        "8GB",
        "16GB",
        "32GB",
        "64GB",
        "128GB",
        "256GB",
        "512GB",
        "1TB",
        "Other"
      ]
    },

    // Interface & Compatibility
    {
      key: "usb_interface",
      label: "USB Interface",
      type: "select",
      required: true,
      options: ["USB 2.0", "USB 3.0", "USB 3.1", "USB-C", "USB-A + USB-C", "Not Sure"]
    },
    {
      key: "connector_type",
      label: "Connector Type",
      type: "select",
      required: true,
      options: ["USB-A", "USB-C", "USB-A + USB-C", "Other"]
    },
    {
      key: "compatible_with",
      label: "Compatible With",
      type: "select",
      required: true,
      options: [
        "Laptop / PC",
        "Phone",
        "Tablet",
        "Laptop / PC + Phone",
        "Universal",
        "Not Sure"
      ]
    },
    {
      key: "otg_support",
      label: "OTG Support",
      type: "boolean",
      advanced: true
    },

    // Physical Condition
    {
      key: "body_condition",
      label: "Body Condition",
      type: "select",
      required: true,
      options: ["Like New", "Very Good", "Good", "Fair", "Damaged"]
    },
    {
      key: "connector_condition",
      label: "Connector Condition",
      type: "select",
      required: true,
      options: ["Very Good", "Good", "Slightly Worn", "Loose", "Damaged"]
    },
    {
      key: "cap_or_cover_condition",
      label: "Cap / Cover Condition",
      type: "select",
      advanced: true,
      options: ["Like New", "Very Good", "Good", "Missing", "Damaged", "Not Applicable"]
    },
    {
      key: "has_scratches",
      label: "Visible Scratches?",
      type: "boolean",
      required: true
    },
    {
      key: "has_cracks",
      label: "Any Cracks?",
      type: "boolean",
      required: true
    },

    // Functionality Check
    {
      key: "detected_by_device",
      label: "Detected by Device Properly",
      type: "boolean",
      required: true
    },
    {
      key: "read_files_properly",
      label: "Reads Files Properly",
      type: "boolean",
      required: true
    },
    {
      key: "write_files_properly",
      label: "Writes / Saves Files Properly",
      type: "boolean",
      required: true
    },
    {
      key: "data_transfer_speed_good",
      label: "Data Transfer Speed Good",
      type: "boolean",
      advanced: true
    },
    {
      key: "connector_fits_well",
      label: "Connector Fits Well",
      type: "boolean",
      advanced: true
    },
    {
      key: "write_protection_issue",
      label: "Write Protection Issue",
      type: "boolean",
      advanced: true
    },

    // Safety / Trust
    {
      key: "formatted_and_ready",
      label: "Formatted and Ready to Use",
      type: "boolean",
      required: true
    },
    {
      key: "data_cleared",
      label: "Previous Data Cleared",
      type: "boolean",
      required: true
    },
    {
      key: "original_product",
      label: "Original Product",
      type: "select",
      required: true,
      options: ["Original", "Compatible / Generic", "Not Sure"]
    },

    // What's Included
    {
      key: "includes_case",
      label: "Protective Case Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "includes_adapter",
      label: "Adapter Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "includes_box",
      label: "Original Box Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "includes_receipt",
      label: "Receipt Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "accessories_notes",
      label: "Other Included Accessories",
      type: "text",
      advanced: true,
      placeholder: "e.g. USB-C adapter, pouch"
    },

    // Extra Notes
    {
      key: "known_faults",
      label: "Known Faults / Defects",
      type: "textarea",
      advanced: true,
      placeholder: "List any issue clearly"
    },
    {
      key: "usage_history",
      label: "Usage History",
      type: "text",
      advanced: true,
      placeholder: "e.g. Used for school files for 6 months"
    },
    {
      key: "reason_for_selling",
      label: "Reason for Selling",
      type: "text",
      advanced: true,
      placeholder: "Optional"
    }
  ]
};

export const USB_FLASH_DRIVE_FIELD_GROUPS: ListingFieldGroup[] = [
  {
    title: "Device Identity",
    keys: ["brand", "model", "color", "capacity"]
  },
  {
    title: "Interface & Compatibility",
    keys: ["usb_interface", "connector_type", "compatible_with", "otg_support"]
  },
  {
    title: "Physical Condition",
    keys: [
      "body_condition",
      "connector_condition",
      "cap_or_cover_condition",
      "has_scratches",
      "has_cracks"
    ]
  },
  {
    title: "Functionality Check",
    keys: [
      "detected_by_device",
      "read_files_properly",
      "write_files_properly",
      "data_transfer_speed_good",
      "connector_fits_well",
      "write_protection_issue"
    ]
  },
  {
    title: "Safety / Trust",
    keys: ["formatted_and_ready", "data_cleared", "original_product"]
  },
  {
    title: "What's Included",
    keys: [
      "includes_case",
      "includes_adapter",
      "includes_box",
      "includes_receipt",
      "accessories_notes"
    ]
  },
  {
    title: "Extra Notes",
    keys: ["known_faults", "usage_history", "reason_for_selling"]
  }
];

export const USB_FLASH_DRIVE_REQUIRED_KEYS = [
  "brand",
  "model",
  "capacity",
  "usb_interface",
  "connector_type",
  "compatible_with",
  "body_condition",
  "connector_condition",
  "has_scratches",
  "has_cracks",
  "detected_by_device",
  "read_files_properly",
  "write_files_properly",
  "formatted_and_ready",
  "data_cleared",
  "original_product"
];

export const MEMORY_CARD_SCHEMA: ListingItemSchema = {
  category: "Electronics & Gadgets",
  subcategory: "Storage & Accessories",
  itemType: "Memory Card",
  fields: [
    // Device Identity
    {
      key: "card_type",
      label: "Card Type",
      type: "select",
      required: true,
      options: ["microSD", "SD Card", "miniSD", "CF Card", "Other"]
    },
    {
      key: "brand",
      label: "Brand",
      type: "select",
      required: true,
      options: [
        "SanDisk",
        "Samsung",
        "Kingston",
        "Lexar",
        "Transcend",
        "PNY",
        "Sony",
        "Toshiba",
        "HP",
        "Other"
      ]
    },
    {
      key: "model",
      label: "Model",
      type: "text",
      required: true,
      placeholder: "e.g. SanDisk Ultra, Samsung EVO Plus"
    },
    {
      key: "capacity",
      label: "Storage Capacity",
      type: "select",
      required: true,
      options: [
        "4GB",
        "8GB",
        "16GB",
        "32GB",
        "64GB",
        "128GB",
        "256GB",
        "512GB",
        "1TB",
        "Other"
      ]
    },

    // Speed & Compatibility
    {
      key: "speed_class",
      label: "Speed Class",
      type: "select",
      required: true,
      options: [
        "Class 10",
        "U1",
        "U3",
        "V10",
        "V30",
        "V60",
        "V90",
        "Not Sure"
      ]
    },
    {
      key: "application_class",
      label: "Application Class",
      type: "select",
      advanced: true,
      options: ["A1", "A2", "Not Sure", "Not Applicable"]
    },
    {
      key: "compatible_with",
      label: "Compatible With",
      type: "select",
      required: true,
      options: [
        "Phone",
        "Camera",
        "Laptop / PC",
        "Tablet",
        "Phone + Camera",
        "Universal",
        "Not Sure"
      ]
    },
    {
      key: "adapter_included",
      label: "SD Adapter Included",
      type: "boolean",
      advanced: true
    },

    // Physical Condition
    {
      key: "body_condition",
      label: "Body Condition",
      type: "select",
      required: true,
      options: ["Like New", "Very Good", "Good", "Fair", "Damaged"]
    },
    {
      key: "contact_pin_condition",
      label: "Contact Pins Condition",
      type: "select",
      required: true,
      options: ["Very Good", "Good", "Slightly Worn", "Damaged"]
    },
    {
      key: "label_condition",
      label: "Label Condition",
      type: "select",
      advanced: true,
      options: ["Clean", "Slightly Worn", "Worn", "Peeling", "Damaged"]
    },
    {
      key: "has_scratches",
      label: "Visible Scratches?",
      type: "boolean",
      required: true
    },
    {
      key: "has_cracks",
      label: "Any Cracks?",
      type: "boolean",
      required: true
    },

    // Functionality Check
    {
      key: "detected_by_device",
      label: "Detected by Device Properly",
      type: "boolean",
      required: true
    },
    {
      key: "read_files_properly",
      label: "Reads Files Properly",
      type: "boolean",
      required: true
    },
    {
      key: "write_files_properly",
      label: "Writes / Saves Files Properly",
      type: "boolean",
      required: true
    },
    {
      key: "data_transfer_speed_good",
      label: "Data Transfer Speed Good",
      type: "boolean",
      advanced: true
    },
    {
      key: "write_protection_issue",
      label: "Write Protection Issue",
      type: "boolean",
      advanced: true
    },
    {
      key: "corruption_issue",
      label: "Any Corruption / File Error Issue",
      type: "boolean",
      advanced: true
    },

    // Safety / Trust
    {
      key: "formatted_and_ready",
      label: "Formatted and Ready to Use",
      type: "boolean",
      required: true
    },
    {
      key: "data_cleared",
      label: "Previous Data Cleared",
      type: "boolean",
      required: true
    },
    {
      key: "original_product",
      label: "Original Product",
      type: "select",
      required: true,
      options: ["Original", "Compatible / Generic", "Not Sure"]
    },

    // What's Included
    {
      key: "includes_case",
      label: "Protective Case Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "includes_box",
      label: "Original Box Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "includes_receipt",
      label: "Receipt Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "accessories_notes",
      label: "Other Included Accessories",
      type: "text",
      advanced: true,
      placeholder: "e.g. SD adapter, card reader"
    },

    // Extra Notes
    {
      key: "known_faults",
      label: "Known Faults / Defects",
      type: "textarea",
      advanced: true,
      placeholder: "List any issue clearly"
    },
    {
      key: "usage_history",
      label: "Usage History",
      type: "text",
      advanced: true,
      placeholder: "e.g. Used in phone for 1 year"
    },
    {
      key: "reason_for_selling",
      label: "Reason for Selling",
      type: "text",
      advanced: true,
      placeholder: "Optional"
    }
  ]
};

export const MEMORY_CARD_FIELD_GROUPS: ListingFieldGroup[] = [
  {
    title: "Device Identity",
    keys: ["card_type", "brand", "model", "capacity"]
  },
  {
    title: "Speed & Compatibility",
    keys: ["speed_class", "application_class", "compatible_with", "adapter_included"]
  },
  {
    title: "Physical Condition",
    keys: [
      "body_condition",
      "contact_pin_condition",
      "label_condition",
      "has_scratches",
      "has_cracks"
    ]
  },
  {
    title: "Functionality Check",
    keys: [
      "detected_by_device",
      "read_files_properly",
      "write_files_properly",
      "data_transfer_speed_good",
      "write_protection_issue",
      "corruption_issue"
    ]
  },
  {
    title: "Safety / Trust",
    keys: ["formatted_and_ready", "data_cleared", "original_product"]
  },
  {
    title: "What's Included",
    keys: ["includes_case", "includes_box", "includes_receipt", "accessories_notes"]
  },
  {
    title: "Extra Notes",
    keys: ["known_faults", "usage_history", "reason_for_selling"]
  }
];

export const MEMORY_CARD_REQUIRED_KEYS = [
  "card_type",
  "brand",
  "model",
  "capacity",
  "speed_class",
  "compatible_with",
  "body_condition",
  "contact_pin_condition",
  "has_scratches",
  "has_cracks",
  "detected_by_device",
  "read_files_properly",
  "write_files_properly",
  "formatted_and_ready",
  "data_cleared",
  "original_product"
];

export const EXTERNAL_HARD_DRIVE_SSD_SCHEMA: ListingItemSchema = {
  category: "Electronics & Gadgets",
  subcategory: "Storage & Accessories",
  itemType: "External Hard Drive / SSD",
  fields: [
    // Device Identity
    {
      key: "drive_type",
      label: "Drive Type",
      type: "select",
      required: true,
      options: ["External HDD", "External SSD", "Portable SSD", "Desktop External Drive", "Other"]
    },
    {
      key: "brand",
      label: "Brand",
      type: "select",
      required: true,
      options: [
        "Seagate",
        "Western Digital",
        "Samsung",
        "SanDisk",
        "Toshiba",
        "Kingston",
        "Transcend",
        "ADATA",
        "LaCie",
        "Other"
      ]
    },
    {
      key: "model",
      label: "Model",
      type: "text",
      required: true,
      placeholder: "e.g. WD My Passport, Samsung T7, Seagate Expansion"
    },
    {
      key: "color",
      label: "Color",
      type: "text",
      advanced: true,
      placeholder: "e.g. Black, Silver, Blue"
    },
    {
      key: "capacity",
      label: "Storage Capacity",
      type: "select",
      required: true,
      options: [
        "120GB",
        "240GB",
        "250GB",
        "500GB",
        "1TB",
        "2TB",
        "4TB",
        "5TB",
        "8TB",
        "Other"
      ]
    },

    // Interface & Compatibility
    {
      key: "connection_interface",
      label: "Connection Interface",
      type: "select",
      required: true,
      options: [
        "USB 3.0",
        "USB 3.1",
        "USB-C",
        "USB-A + USB-C",
        "Thunderbolt",
        "Not Sure"
      ]
    },
    {
      key: "connector_type",
      label: "Connector Type",
      type: "select",
      required: true,
      options: ["USB-A", "USB-C", "USB-A + USB-C", "Thunderbolt", "Other"]
    },
    {
      key: "compatible_with",
      label: "Compatible With",
      type: "select",
      required: true,
      options: [
        "Laptop / PC",
        "Phone",
        "Tablet",
        "Laptop / PC + Phone",
        "Universal",
        "Not Sure"
      ]
    },
    {
      key: "power_source",
      label: "Power Source",
      type: "select",
      advanced: true,
      options: ["USB Powered", "External Power Adapter", "USB + External Power", "Not Sure"]
    },

    // Performance
    {
      key: "transfer_speed_class",
      label: "Transfer Speed Class",
      type: "select",
      advanced: true,
      options: ["Basic", "Good", "Fast", "Very Fast", "Not Sure"]
    },
    {
      key: "rpm",
      label: "RPM",
      type: "select",
      advanced: true,
      options: ["5400 RPM", "7200 RPM", "Not Applicable", "Not Sure"]
    },

    // Physical Condition
    {
      key: "body_condition",
      label: "Body Condition",
      type: "select",
      required: true,
      options: ["Like New", "Very Good", "Good", "Fair", "Damaged"]
    },
    {
      key: "port_condition",
      label: "Port Condition",
      type: "select",
      required: true,
      options: ["Very Good", "Good", "Loose but Working", "Damaged"]
    },
    {
      key: "cable_condition",
      label: "Cable Condition",
      type: "select",
      advanced: true,
      options: ["Like New", "Very Good", "Good", "Worn", "Damaged", "Not Included"]
    },
    {
      key: "has_scratches",
      label: "Visible Scratches?",
      type: "boolean",
      required: true
    },
    {
      key: "has_cracks",
      label: "Any Cracks?",
      type: "boolean",
      required: true
    },

    // Functionality Check
    {
      key: "detected_by_device",
      label: "Detected by Device Properly",
      type: "boolean",
      required: true
    },
    {
      key: "read_files_properly",
      label: "Reads Files Properly",
      type: "boolean",
      required: true
    },
    {
      key: "write_files_properly",
      label: "Writes / Saves Files Properly",
      type: "boolean",
      required: true
    },
    {
      key: "transfer_speed_good",
      label: "Transfer Speed Good",
      type: "boolean",
      advanced: true
    },
    {
      key: "disconnects_randomly",
      label: "Disconnects Randomly",
      type: "boolean",
      advanced: true
    },
    {
      key: "unusual_noise_or_vibration",
      label: "Unusual Noise / Vibration",
      type: "boolean",
      advanced: true,
      helpText: "Mostly important for HDDs."
    },
    {
      key: "overheating_issue",
      label: "Any Overheating Issue?",
      type: "boolean",
      advanced: true
    },

    // Safety / Trust
    {
      key: "formatted_and_ready",
      label: "Formatted and Ready to Use",
      type: "boolean",
      required: true
    },
    {
      key: "data_cleared",
      label: "Previous Data Cleared",
      type: "boolean",
      required: true
    },
    {
      key: "health_status",
      label: "Drive Health Status",
      type: "select",
      advanced: true,
      options: ["Excellent", "Good", "Fair", "Warning", "Not Sure"]
    },
    {
      key: "original_product",
      label: "Original Product",
      type: "select",
      required: true,
      options: ["Original", "Compatible / Generic", "Not Sure"]
    },

    // What's Included
    {
      key: "includes_cable",
      label: "Connection Cable Included",
      type: "boolean",
      required: true
    },
    {
      key: "includes_power_adapter",
      label: "Power Adapter Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "includes_case",
      label: "Protective Case Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "includes_box",
      label: "Original Box Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "includes_receipt",
      label: "Receipt Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "accessories_notes",
      label: "Other Included Accessories",
      type: "text",
      advanced: true,
      placeholder: "e.g. USB-C cable, pouch, power adapter"
    },

    // Extra Notes
    {
      key: "known_faults",
      label: "Known Faults / Defects",
      type: "textarea",
      advanced: true,
      placeholder: "List any issue clearly"
    },
    {
      key: "usage_history",
      label: "Usage History",
      type: "text",
      advanced: true,
      placeholder: "e.g. Used for backups for 1 year"
    },
    {
      key: "reason_for_selling",
      label: "Reason for Selling",
      type: "text",
      advanced: true,
      placeholder: "Optional"
    }
  ]
};

export const EXTERNAL_HARD_DRIVE_SSD_FIELD_GROUPS: ListingFieldGroup[] = [
  {
    title: "Device Identity",
    keys: ["drive_type", "brand", "model", "color", "capacity"]
  },
  {
    title: "Interface & Compatibility",
    keys: ["connection_interface", "connector_type", "compatible_with", "power_source"]
  },
  {
    title: "Performance",
    keys: ["transfer_speed_class", "rpm"]
  },
  {
    title: "Physical Condition",
    keys: [
      "body_condition",
      "port_condition",
      "cable_condition",
      "has_scratches",
      "has_cracks"
    ]
  },
  {
    title: "Functionality Check",
    keys: [
      "detected_by_device",
      "read_files_properly",
      "write_files_properly",
      "transfer_speed_good",
      "disconnects_randomly",
      "unusual_noise_or_vibration",
      "overheating_issue"
    ]
  },
  {
    title: "Safety / Trust",
    keys: [
      "formatted_and_ready",
      "data_cleared",
      "health_status",
      "original_product"
    ]
  },
  {
    title: "What's Included",
    keys: [
      "includes_cable",
      "includes_power_adapter",
      "includes_case",
      "includes_box",
      "includes_receipt",
      "accessories_notes"
    ]
  },
  {
    title: "Extra Notes",
    keys: ["known_faults", "usage_history", "reason_for_selling"]
  }
];

export const EXTERNAL_HARD_DRIVE_SSD_REQUIRED_KEYS = [
  "drive_type",
  "brand",
  "model",
  "capacity",
  "connection_interface",
  "connector_type",
  "compatible_with",
  "body_condition",
  "port_condition",
  "has_scratches",
  "has_cracks",
  "detected_by_device",
  "read_files_properly",
  "write_files_properly",
  "formatted_and_ready",
  "data_cleared",
  "original_product",
  "includes_cable"
];

export const KEYBOARD_SCHEMA: ListingItemSchema = {
  category: "Electronics & Gadgets",
  subcategory: "Storage & Accessories",
  itemType: "Keyboard",
  fields: [
    // Device Identity
    {
      key: "keyboard_type",
      label: "Keyboard Type",
      type: "select",
      required: true,
      options: [
        "Wired Keyboard",
        "Wireless Keyboard",
        "Bluetooth Keyboard",
        "Mechanical Keyboard",
        "Membrane Keyboard",
        "Gaming Keyboard",
        "Mini Keyboard",
        "Other"
      ]
    },
    {
      key: "brand",
      label: "Brand",
      type: "select",
      required: true,
      options: [
        "Logitech",
        "HP",
        "Dell",
        "Microsoft",
        "Redragon",
        "Razer",
        "Corsair",
        "HyperX",
        "Apple",
        "Lenovo",
        "A4Tech",
        "Other"
      ]
    },
    {
      key: "model",
      label: "Model",
      type: "text",
      required: true,
      placeholder: "e.g. Logitech K380, Redragon K552"
    },
    {
      key: "color",
      label: "Color",
      type: "text",
      required: true,
      placeholder: "e.g. Black, White, Gray"
    },
    {
      key: "layout",
      label: "Keyboard Layout",
      type: "select",
      required: true,
      options: ["Full Size", "Tenkeyless (TKL)", "60%", "75%", "Compact", "Not Sure"]
    },

    // Connectivity & Compatibility
    {
      key: "connection_type",
      label: "Connection Type",
      type: "select",
      required: true,
      options: ["Wired", "Wireless", "Bluetooth", "Wireless + Bluetooth"]
    },
    {
      key: "connector_type",
      label: "Connector Type",
      type: "select",
      advanced: true,
      options: ["USB-A", "USB-C", "Lightning", "Wireless Receiver", "Not Applicable", "Other"]
    },
    {
      key: "compatible_with",
      label: "Compatible With",
      type: "select",
      required: true,
      options: [
        "Laptop / PC",
        "Tablet",
        "Phone",
        "Laptop / PC + Tablet",
        "Universal",
        "Not Sure"
      ]
    },
    {
      key: "bluetooth_working",
      label: "Bluetooth Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "wireless_receiver_included",
      label: "Wireless Receiver Included",
      type: "boolean",
      advanced: true
    },

    // Key & Switch Details
    {
      key: "switch_type",
      label: "Switch Type",
      type: "select",
      advanced: true,
      options: ["Mechanical", "Membrane", "Scissor", "Optical", "Not Sure", "Not Applicable"]
    },
    {
      key: "backlight_available",
      label: "Backlight Available",
      type: "boolean",
      advanced: true
    },
    {
      key: "rgb_lighting",
      label: "RGB Lighting",
      type: "boolean",
      advanced: true
    },
    {
      key: "numeric_keypad",
      label: "Numeric Keypad",
      type: "boolean",
      advanced: true
    },

    // Physical Condition
    {
      key: "body_condition",
      label: "Body Condition",
      type: "select",
      required: true,
      options: ["Like New", "Very Good", "Good", "Fair", "Damaged"]
    },
    {
      key: "keycap_condition",
      label: "Keycap Condition",
      type: "select",
      required: true,
      options: ["Like New", "Very Good", "Good", "Worn", "Damaged", "Missing Keys"]
    },
    {
      key: "cable_condition",
      label: "Cable Condition",
      type: "select",
      advanced: true,
      options: ["Like New", "Very Good", "Good", "Worn", "Damaged", "Not Applicable"]
    },
    {
      key: "has_scratches",
      label: "Visible Scratches?",
      type: "boolean",
      required: true
    },
    {
      key: "has_cracks",
      label: "Any Cracks?",
      type: "boolean",
      required: true
    },

    // Functionality Check
    {
      key: "all_keys_working",
      label: "All Keys Working",
      type: "boolean",
      required: true
    },
    {
      key: "some_keys_not_working",
      label: "Some Keys Not Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "spacebar_working",
      label: "Spacebar Working",
      type: "boolean",
      required: true
    },
    {
      key: "enter_key_working",
      label: "Enter Key Working",
      type: "boolean",
      required: true
    },
    {
      key: "function_keys_working",
      label: "Function Keys Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "connection_stable",
      label: "Connection Stable",
      type: "boolean",
      required: true
    },
    {
      key: "backlight_working",
      label: "Backlight Working",
      type: "boolean",
      advanced: true
    },

    // Battery / Power
    {
      key: "battery_type",
      label: "Battery Type",
      type: "select",
      advanced: true,
      options: ["Built-in Rechargeable", "AA / AAA Batteries", "No Battery", "Not Sure"]
    },
    {
      key: "battery_condition",
      label: "Battery Condition",
      type: "select",
      advanced: true,
      options: ["Excellent", "Good", "Fair", "Weak", "Needs Replacement", "Not Applicable"]
    },
    {
      key: "charging_port_working",
      label: "Charging Port Working",
      type: "boolean",
      advanced: true
    },

    // What's Included
    {
      key: "includes_cable",
      label: "Cable Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "includes_receiver",
      label: "Receiver Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "includes_box",
      label: "Original Box Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "includes_receipt",
      label: "Receipt Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "accessories_notes",
      label: "Other Included Accessories",
      type: "text",
      advanced: true,
      placeholder: "e.g. Wrist rest, extra keycaps, USB cable"
    },

    // Extra Notes
    {
      key: "known_faults",
      label: "Known Faults / Defects",
      type: "textarea",
      advanced: true,
      placeholder: "List any issue clearly"
    },
    {
      key: "usage_history",
      label: "Usage History",
      type: "text",
      advanced: true,
      placeholder: "e.g. Used for school work for 1 year"
    },
    {
      key: "reason_for_selling",
      label: "Reason for Selling",
      type: "text",
      advanced: true,
      placeholder: "Optional"
    }
  ]
};

export const KEYBOARD_FIELD_GROUPS: ListingFieldGroup[] = [
  {
    title: "Device Identity",
    keys: ["keyboard_type", "brand", "model", "color", "layout"]
  },
  {
    title: "Connectivity & Compatibility",
    keys: [
      "connection_type",
      "connector_type",
      "compatible_with",
      "bluetooth_working",
      "wireless_receiver_included"
    ]
  },
  {
    title: "Key & Switch Details",
    keys: ["switch_type", "backlight_available", "rgb_lighting", "numeric_keypad"]
  },
  {
    title: "Physical Condition",
    keys: [
      "body_condition",
      "keycap_condition",
      "cable_condition",
      "has_scratches",
      "has_cracks"
    ]
  },
  {
    title: "Functionality Check",
    keys: [
      "all_keys_working",
      "some_keys_not_working",
      "spacebar_working",
      "enter_key_working",
      "function_keys_working",
      "connection_stable",
      "backlight_working"
    ]
  },
  {
    title: "Battery / Power",
    keys: ["battery_type", "battery_condition", "charging_port_working"]
  },
  {
    title: "What's Included",
    keys: [
      "includes_cable",
      "includes_receiver",
      "includes_box",
      "includes_receipt",
      "accessories_notes"
    ]
  },
  {
    title: "Extra Notes",
    keys: ["known_faults", "usage_history", "reason_for_selling"]
  }
];

export const KEYBOARD_REQUIRED_KEYS = [
  "keyboard_type",
  "brand",
  "model",
  "color",
  "layout",
  "connection_type",
  "compatible_with",
  "body_condition",
  "keycap_condition",
  "has_scratches",
  "has_cracks",
  "all_keys_working",
  "spacebar_working",
  "enter_key_working",
  "connection_stable"
];

export const MOUSE_SCHEMA: ListingItemSchema = {
  category: "Electronics & Gadgets",
  subcategory: "Storage & Accessories",
  itemType: "Mouse",
  fields: [
    // Device Identity
    {
      key: "mouse_type",
      label: "Mouse Type",
      type: "select",
      required: true,
      options: [
        "Wired Mouse",
        "Wireless Mouse",
        "Bluetooth Mouse",
        "Gaming Mouse",
        "Vertical Mouse",
        "Trackball Mouse",
        "Other"
      ]
    },
    {
      key: "brand",
      label: "Brand",
      type: "select",
      required: true,
      options: [
        "Logitech",
        "HP",
        "Dell",
        "Microsoft",
        "Razer",
        "Redragon",
        "HyperX",
        "Corsair",
        "Apple",
        "Lenovo",
        "A4Tech",
        "Other"
      ]
    },
    {
      key: "model",
      label: "Model",
      type: "text",
      required: true,
      placeholder: "e.g. Logitech M185, Razer DeathAdder Essential"
    },
    {
      key: "color",
      label: "Color",
      type: "text",
      required: true,
      placeholder: "e.g. Black, White, Gray"
    },
    {
      key: "hand_orientation",
      label: "Hand Orientation",
      type: "select",
      advanced: true,
      options: ["Right-Handed", "Left-Handed", "Ambidextrous", "Not Sure"]
    },

    // Connectivity & Compatibility
    {
      key: "connection_type",
      label: "Connection Type",
      type: "select",
      required: true,
      options: ["Wired", "Wireless", "Bluetooth", "Wireless + Bluetooth"]
    },
    {
      key: "connector_type",
      label: "Connector Type",
      type: "select",
      advanced: true,
      options: ["USB-A", "USB-C", "Wireless Receiver", "Not Applicable", "Other"]
    },
    {
      key: "compatible_with",
      label: "Compatible With",
      type: "select",
      required: true,
      options: [
        "Laptop / PC",
        "Tablet",
        "Laptop / PC + Tablet",
        "Universal",
        "Not Sure"
      ]
    },
    {
      key: "bluetooth_working",
      label: "Bluetooth Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "wireless_receiver_included",
      label: "Wireless Receiver Included",
      type: "boolean",
      advanced: true
    },

    // Sensor & Control Details
    {
      key: "sensor_type",
      label: "Sensor Type",
      type: "select",
      advanced: true,
      options: ["Optical", "Laser", "Trackball", "Not Sure"]
    },
    {
      key: "dpi_adjustable",
      label: "DPI Adjustable",
      type: "boolean",
      advanced: true
    },
    {
      key: "programmable_buttons",
      label: "Programmable Buttons",
      type: "boolean",
      advanced: true
    },
    {
      key: "silent_click",
      label: "Silent Click",
      type: "boolean",
      advanced: true
    },

    // Physical Condition
    {
      key: "body_condition",
      label: "Body Condition",
      type: "select",
      required: true,
      options: ["Like New", "Very Good", "Good", "Fair", "Damaged"]
    },
    {
      key: "button_condition",
      label: "Buttons Condition",
      type: "select",
      required: true,
      options: ["Fully Working", "Some Buttons Weak", "Some Buttons Not Working", "Damaged"]
    },
    {
      key: "scroll_wheel_condition",
      label: "Scroll Wheel Condition",
      type: "select",
      required: true,
      options: ["Fully Working", "Stiff but Working", "Partially Working", "Not Working", "Damaged"]
    },
    {
      key: "feet_condition",
      label: "Mouse Feet / Base Condition",
      type: "select",
      advanced: true,
      options: ["Like New", "Very Good", "Good", "Worn", "Damaged"]
    },
    {
      key: "cable_condition",
      label: "Cable Condition",
      type: "select",
      advanced: true,
      options: ["Like New", "Very Good", "Good", "Worn", "Damaged", "Not Applicable"]
    },
    {
      key: "has_scratches",
      label: "Visible Scratches?",
      type: "boolean",
      required: true
    },
    {
      key: "has_cracks",
      label: "Any Cracks?",
      type: "boolean",
      required: true
    },

    // Functionality Check
    {
      key: "left_click_working",
      label: "Left Click Working",
      type: "boolean",
      required: true
    },
    {
      key: "right_click_working",
      label: "Right Click Working",
      type: "boolean",
      required: true
    },
    {
      key: "scroll_wheel_working",
      label: "Scroll Wheel Working",
      type: "boolean",
      required: true
    },
    {
      key: "cursor_tracking_good",
      label: "Cursor Tracking Good",
      type: "boolean",
      required: true
    },
    {
      key: "connection_stable",
      label: "Connection Stable",
      type: "boolean",
      required: true
    },
    {
      key: "side_buttons_working",
      label: "Side Buttons Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "dpi_button_working",
      label: "DPI Button Working",
      type: "boolean",
      advanced: true
    },

    // Battery / Power
    {
      key: "battery_type",
      label: "Battery Type",
      type: "select",
      advanced: true,
      options: ["Built-in Rechargeable", "AA / AAA Batteries", "No Battery", "Not Sure"]
    },
    {
      key: "battery_condition",
      label: "Battery Condition",
      type: "select",
      advanced: true,
      options: ["Excellent", "Good", "Fair", "Weak", "Needs Replacement", "Not Applicable"]
    },
    {
      key: "charging_port_working",
      label: "Charging Port Working",
      type: "boolean",
      advanced: true
    },

    // What's Included
    {
      key: "includes_cable",
      label: "Cable Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "includes_receiver",
      label: "Receiver Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "includes_box",
      label: "Original Box Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "includes_receipt",
      label: "Receipt Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "accessories_notes",
      label: "Other Included Accessories",
      type: "text",
      advanced: true,
      placeholder: "e.g. USB receiver, cable, carrying pouch"
    },

    // Extra Notes
    {
      key: "known_faults",
      label: "Known Faults / Defects",
      type: "textarea",
      advanced: true,
      placeholder: "List any issue clearly"
    },
    {
      key: "usage_history",
      label: "Usage History",
      type: "text",
      advanced: true,
      placeholder: "e.g. Used for school work for 8 months"
    },
    {
      key: "reason_for_selling",
      label: "Reason for Selling",
      type: "text",
      advanced: true,
      placeholder: "Optional"
    }
  ]
};

export const MOUSE_FIELD_GROUPS: ListingFieldGroup[] = [
  {
    title: "Device Identity",
    keys: ["mouse_type", "brand", "model", "color", "hand_orientation"]
  },
  {
    title: "Connectivity & Compatibility",
    keys: [
      "connection_type",
      "connector_type",
      "compatible_with",
      "bluetooth_working",
      "wireless_receiver_included"
    ]
  },
  {
    title: "Sensor & Control Details",
    keys: ["sensor_type", "dpi_adjustable", "programmable_buttons", "silent_click"]
  },
  {
    title: "Physical Condition",
    keys: [
      "body_condition",
      "button_condition",
      "scroll_wheel_condition",
      "feet_condition",
      "cable_condition",
      "has_scratches",
      "has_cracks"
    ]
  },
  {
    title: "Functionality Check",
    keys: [
      "left_click_working",
      "right_click_working",
      "scroll_wheel_working",
      "cursor_tracking_good",
      "connection_stable",
      "side_buttons_working",
      "dpi_button_working"
    ]
  },
  {
    title: "Battery / Power",
    keys: ["battery_type", "battery_condition", "charging_port_working"]
  },
  {
    title: "What's Included",
    keys: [
      "includes_cable",
      "includes_receiver",
      "includes_box",
      "includes_receipt",
      "accessories_notes"
    ]
  },
  {
    title: "Extra Notes",
    keys: ["known_faults", "usage_history", "reason_for_selling"]
  }
];

export const MOUSE_REQUIRED_KEYS = [
  "mouse_type",
  "brand",
  "model",
  "color",
  "connection_type",
  "compatible_with",
  "body_condition",
  "button_condition",
  "scroll_wheel_condition",
  "has_scratches",
  "has_cracks",
  "left_click_working",
  "right_click_working",
  "scroll_wheel_working",
  "cursor_tracking_good",
  "connection_stable"
];
