export type ListingSpecFieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "multiselect"
  | "boolean";

export interface ListingSpecField {
  key: string;
  label: string;
  type: ListingSpecFieldType;
  required?: boolean;
  advanced?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[];
}

export interface ListingItemSchema {
  category: string;
  subcategory: string;
  itemType: string;
  fields: ListingSpecField[];
}

export const SMARTPHONE_SCHEMA: ListingItemSchema = {
  category: "Electronics & Gadgets",
  subcategory: "Phones & Mobile Devices",
  itemType: "Smartphone",
  fields: [
    // Phone Identity
    {
      key: "brand",
      label: "Brand",
      type: "select",
      required: true,
      options: [
        "Apple",
        "Samsung",
        "Xiaomi",
        "Redmi",
        "Tecno",
        "Infinix",
        "itel",
        "Huawei",
        "Oppo",
        "Vivo",
        "Nokia",
        "Google Pixel",
        "OnePlus",
        "Motorola",
        "Realme",
        "Other"
      ]
    },
    {
      key: "model",
      label: "Model",
      type: "text",
      required: true,
      placeholder: "e.g. iPhone 11, Galaxy A14, Redmi Note 12"
    },
    {
      key: "series_variant",
      label: "Series / Variant",
      type: "text",
      advanced: true,
      placeholder: "e.g. Pro, Pro Max, 5G, Dual SIM"
    },
    {
      key: "color",
      label: "Color",
      type: "text",
      required: true,
      placeholder: "e.g. Black, Blue, Silver"
    },
    {
      key: "os",
      label: "Operating System",
      type: "select",
      required: true,
      options: ["Android", "iPhone (iOS)", "Other"]
    },
    {
      key: "release_year",
      label: "Release Year",
      type: "number",
      advanced: true,
      placeholder: "e.g. 2021"
    },

    // Storage & Performance
    {
      key: "storage",
      label: "Storage Capacity",
      type: "select",
      required: true,
      options: ["16GB", "32GB", "64GB", "128GB", "256GB", "512GB", "1TB"]
    },
    {
      key: "ram",
      label: "RAM",
      type: "select",
      advanced: true,
      options: ["2GB", "3GB", "4GB", "6GB", "8GB", "12GB", "16GB", "Other"]
    },
    {
      key: "chipset",
      label: "Processor / Chipset",
      type: "text",
      advanced: true,
      placeholder: "e.g. Snapdragon 680, A15 Bionic"
    },
    {
      key: "screen_size",
      label: "Screen Size",
      type: "text",
      advanced: true,
      placeholder: 'e.g. 6.1"'
    },
    {
      key: "refresh_rate",
      label: "Refresh Rate",
      type: "select",
      advanced: true,
      options: ["60Hz", "90Hz", "120Hz", "144Hz", "Not Sure"]
    },

    // Network & Connectivity
    {
      key: "network_type",
      label: "Network Support",
      type: "multiselect",
      required: true,
      options: ["3G", "4G", "5G"]
    },
    {
      key: "sim_type",
      label: "SIM Type",
      type: "select",
      required: true,
      options: ["Single SIM", "Dual SIM", "eSIM", "Dual SIM + eSIM"]
    },
    {
      key: "network_status",
      label: "Network Status",
      type: "select",
      required: true,
      options: [
        "Factory Unlocked",
        "Works on TNM",
        "Works on Airtel",
        "Works on TNM & Airtel",
        "Carrier Locked",
        "Not Sure"
      ]
    },
    {
      key: "dual_sim",
      label: "Dual SIM",
      type: "boolean",
      advanced: true
    },
    {
      key: "esim_support",
      label: "eSIM Support",
      type: "boolean",
      advanced: true
    },
    {
      key: "wifi_working",
      label: "Wi-Fi Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "bluetooth_working",
      label: "Bluetooth Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "gps_working",
      label: "GPS Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "nfc_available",
      label: "NFC Available",
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
      key: "screen_condition",
      label: "Screen Condition",
      type: "select",
      required: true,
      options: [
        "Clean",
        "Minor Scratches",
        "Noticeable Scratches",
        "Cracked",
        "Replaced Screen"
      ]
    },
    {
      key: "back_condition",
      label: "Back Cover Condition",
      type: "select",
      advanced: true,
      options: ["Like New", "Very Good", "Good", "Fair", "Damaged"]
    },
    {
      key: "frame_condition",
      label: "Frame / Edges Condition",
      type: "select",
      advanced: true,
      options: ["Like New", "Very Good", "Good", "Fair", "Damaged"]
    },
    {
      key: "has_cracks",
      label: "Any Cracks?",
      type: "boolean",
      required: true
    },
    {
      key: "has_scratches",
      label: "Visible Scratches?",
      type: "boolean",
      required: true
    },
    {
      key: "water_damage_signs",
      label: "Signs of Water Damage",
      type: "boolean",
      advanced: true
    },

    // Functionality Check
    {
      key: "face_id_fingerprint",
      label: "Face ID / Fingerprint",
      type: "select",
      advanced: true,
      options: [
        "Fully Working",
        "Partially Working",
        "Not Working",
        "Not Available"
      ]
    },
    {
      key: "front_camera_working",
      label: "Front Camera Working",
      type: "boolean",
      required: true
    },
    {
      key: "back_camera_working",
      label: "Back Camera Working",
      type: "boolean",
      required: true
    },
    {
      key: "speaker_working",
      label: "Speaker Working",
      type: "boolean",
      required: true
    },
    {
      key: "microphone_working",
      label: "Microphone Working",
      type: "boolean",
      required: true
    },
    {
      key: "charging_port_working",
      label: "Charging Port Working",
      type: "boolean",
      required: true
    },
    {
      key: "buttons_working",
      label: "Buttons Working",
      type: "boolean",
      required: true
    },
    {
      key: "flashlight_working",
      label: "Flashlight Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "vibration_working",
      label: "Vibration Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "touchscreen_working",
      label: "Touch Screen Working Properly",
      type: "boolean",
      required: true
    },

    // Battery
    {
      key: "battery_condition",
      label: "Battery Condition",
      type: "select",
      required: true,
      options: ["Excellent", "Good", "Fair", "Weak", "Needs Replacement"]
    },
    {
      key: "battery_health_percent",
      label: "Battery Health %",
      type: "number",
      advanced: true,
      placeholder: "e.g. 87"
    },
    {
      key: "battery_backup",
      label: "Battery Backup",
      type: "select",
      required: true,
      options: [
        "Full Day",
        "Half Day to Full Day",
        "Few Hours",
        "Drains Fast",
        "Not Sure"
      ]
    },
    {
      key: "battery_replaced",
      label: "Battery Ever Replaced?",
      type: "boolean",
      advanced: true
    },
    {
      key: "fast_charging_supported",
      label: "Fast Charging Supported",
      type: "boolean",
      advanced: true
    },

    // What's Included
    {
      key: "includes_charger",
      label: "Charger Included",
      type: "boolean",
      required: true
    },
    {
      key: "includes_cable",
      label: "Cable Included",
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
      key: "includes_case",
      label: "Case / Cover Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "includes_screen_protector",
      label: "Screen Protector Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "accessories_notes",
      label: "Other Included Accessories",
      type: "text",
      advanced: true,
      placeholder: "e.g. Earphones, adapter, pouch"
    },

    // Ownership / Safety
    {
      key: "icloud_frp_status",
      label: "iCloud / FRP Status",
      type: "select",
      required: true,
      options: [
        "No Lock / Safe to Reset",
        "iCloud Removed",
        "FRP Removed",
        "Locked",
        "Not Sure"
      ]
    },
    {
      key: "previous_account_removed",
      label: "Previous Account Removed",
      type: "boolean",
      required: true
    },
    {
      key: "repair_history",
      label: "Has It Been Repaired Before?",
      type: "boolean",
      advanced: true
    },
    {
      key: "replacement_parts",
      label: "Any Replaced Parts?",
      type: "text",
      advanced: true,
      placeholder: "e.g. Screen replaced, battery changed"
    },
    {
      key: "warranty_remaining",
      label: "Warranty Remaining",
      type: "boolean",
      advanced: true
    },
    {
      key: "proof_of_ownership",
      label: "Proof of Ownership Available",
      type: "boolean",
      advanced: true
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
      placeholder: "e.g. Used for 1 year"
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

export const SMARTPHONE_FIELD_GROUPS = [
  {
    title: "Phone Identity",
    keys: ["brand", "model", "series_variant", "color", "os", "release_year"]
  },
  {
    title: "Storage & Performance",
    keys: ["storage", "ram", "chipset", "screen_size", "refresh_rate"]
  },
  {
    title: "Network & Connectivity",
    keys: [
      "network_type",
      "sim_type",
      "network_status",
      "dual_sim",
      "esim_support",
      "wifi_working",
      "bluetooth_working",
      "gps_working",
      "nfc_available"
    ]
  },
  {
    title: "Physical Condition",
    keys: [
      "body_condition",
      "screen_condition",
      "back_condition",
      "frame_condition",
      "has_cracks",
      "has_scratches",
      "water_damage_signs"
    ]
  },
  {
    title: "Functionality Check",
    keys: [
      "face_id_fingerprint",
      "front_camera_working",
      "back_camera_working",
      "speaker_working",
      "microphone_working",
      "charging_port_working",
      "buttons_working",
      "flashlight_working",
      "vibration_working",
      "touchscreen_working"
    ]
  },
  {
    title: "Battery",
    keys: [
      "battery_condition",
      "battery_health_percent",
      "battery_backup",
      "battery_replaced",
      "fast_charging_supported"
    ]
  },
  {
    title: "What's Included",
    keys: [
      "includes_charger",
      "includes_cable",
      "includes_box",
      "includes_receipt",
      "includes_case",
      "includes_screen_protector",
      "accessories_notes"
    ]
  },
  {
    title: "Ownership / Safety",
    keys: [
      "icloud_frp_status",
      "previous_account_removed",
      "repair_history",
      "replacement_parts",
      "warranty_remaining",
      "proof_of_ownership"
    ]
  },
  {
    title: "Extra Notes",
    keys: ["known_faults", "usage_history", "reason_for_selling"]
  }
];

export const SMARTPHONE_REQUIRED_KEYS = [
  "brand",
  "model",
  "color",
  "os",
  "storage",
  "network_type",
  "sim_type",
  "network_status",
  "body_condition",
  "screen_condition",
  "has_cracks",
  "has_scratches",
  "front_camera_working",
  "back_camera_working",
  "speaker_working",
  "microphone_working",
  "charging_port_working",
  "buttons_working",
  "touchscreen_working",
  "battery_condition",
  "battery_backup",
  "includes_charger",
  "icloud_frp_status",
  "previous_account_removed"
];

export const FEATURE_PHONE_SCHEMA: ListingItemSchema = {
  category: "Electronics & Gadgets",
  subcategory: "Phones & Mobile Devices",
  itemType: "Feature Phone",
  fields: [
    // Phone Identity
    {
      key: "brand",
      label: "Brand",
      type: "select",
      required: true,
      options: [
        "Nokia",
        "itel",
        "Tecno",
        "Samsung",
        "Huawei",
        "Alcatel",
        "Motorola",
        "Other"
      ]
    },
    {
      key: "model",
      label: "Model",
      type: "text",
      required: true,
      placeholder: "e.g. Nokia 105, itel 2160"
    },
    {
      key: "color",
      label: "Color",
      type: "text",
      required: true,
      placeholder: "e.g. Black, Blue"
    },
    {
      key: "phone_type",
      label: "Phone Type",
      type: "select",
      required: true,
      options: ["Bar Phone", "Fold Phone", "QWERTY", "Other"]
    },

    // Storage & Basic Specs
    {
      key: "sim_type",
      label: "SIM Type",
      type: "select",
      required: true,
      options: ["Single SIM", "Dual SIM"]
    },
    {
      key: "network_type",
      label: "Network Support",
      type: "multiselect",
      required: true,
      options: ["2G", "3G", "4G"]
    },
    {
      key: "memory_card_support",
      label: "Memory Card Support",
      type: "boolean",
      advanced: true
    },
    {
      key: "torch_available",
      label: "Torch / Flashlight Available",
      type: "boolean",
      advanced: true
    },
    {
      key: "wireless_radio",
      label: "Wireless FM Radio",
      type: "boolean",
      advanced: true
    },
    {
      key: "bluetooth_available",
      label: "Bluetooth Available",
      type: "boolean",
      advanced: true
    },

    // Network & Safety
    {
      key: "network_status",
      label: "Network Status",
      type: "select",
      required: true,
      options: [
        "Factory Unlocked",
        "Works on TNM",
        "Works on Airtel",
        "Works on TNM & Airtel",
        "Carrier Locked",
        "Not Sure"
      ]
    },
    {
      key: "previous_account_removed",
      label: "Previous Account Removed / No Lock Issues",
      type: "boolean",
      required: true,
      helpText: "Use Yes if the phone is safe to use and reset without account problems."
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
      key: "screen_condition",
      label: "Screen Condition",
      type: "select",
      required: true,
      options: [
        "Clean",
        "Minor Scratches",
        "Noticeable Scratches",
        "Cracked",
        "Replaced Screen"
      ]
    },
    {
      key: "keypad_condition",
      label: "Keypad Condition",
      type: "select",
      required: true,
      options: ["Fully Working", "Some Buttons Weak", "Some Buttons Not Working", "Damaged"]
    },
    {
      key: "has_cracks",
      label: "Any Cracks?",
      type: "boolean",
      required: true
    },
    {
      key: "has_scratches",
      label: "Visible Scratches?",
      type: "boolean",
      required: true
    },

    // Functionality Check
    {
      key: "screen_working",
      label: "Screen Working Properly",
      type: "boolean",
      required: true
    },
    {
      key: "speaker_working",
      label: "Speaker Working",
      type: "boolean",
      required: true
    },
    {
      key: "microphone_working",
      label: "Microphone Working",
      type: "boolean",
      required: true
    },
    {
      key: "earpiece_working",
      label: "Earpiece Working",
      type: "boolean",
      required: true
    },
    {
      key: "charging_port_working",
      label: "Charging Port Working",
      type: "boolean",
      required: true
    },
    {
      key: "keypad_working",
      label: "Keypad Working",
      type: "boolean",
      required: true
    },
    {
      key: "battery_contacts_ok",
      label: "Battery Contacts Good",
      type: "boolean",
      advanced: true
    },
    {
      key: "torch_working",
      label: "Torch / Flashlight Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "radio_working",
      label: "Radio Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "bluetooth_working",
      label: "Bluetooth Working",
      type: "boolean",
      advanced: true
    },

    // Battery
    {
      key: "battery_condition",
      label: "Battery Condition",
      type: "select",
      required: true,
      options: ["Excellent", "Good", "Fair", "Weak", "Needs Replacement"]
    },
    {
      key: "battery_backup",
      label: "Battery Backup",
      type: "select",
      required: true,
      options: [
        "Several Days",
        "1-2 Days",
        "Less Than a Day",
        "Drains Fast",
        "Not Sure"
      ]
    },
    {
      key: "battery_replaced",
      label: "Battery Ever Replaced?",
      type: "boolean",
      advanced: true
    },

    // What's Included
    {
      key: "includes_charger",
      label: "Charger Included",
      type: "boolean",
      required: true
    },
    {
      key: "includes_battery",
      label: "Battery Included",
      type: "boolean",
      required: true
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
      placeholder: "e.g. Earphones, extra battery"
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
      placeholder: "e.g. Used for 8 months"
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

export const FEATURE_PHONE_REQUIRED_KEYS = [
  "brand",
  "model",
  "color",
  "phone_type",
  "sim_type",
  "network_type",
  "network_status",
  "previous_account_removed",
  "body_condition",
  "screen_condition",
  "keypad_condition",
  "has_cracks",
  "has_scratches",
  "screen_working",
  "speaker_working",
  "microphone_working",
  "earpiece_working",
  "charging_port_working",
  "keypad_working",
  "battery_condition",
  "battery_backup",
  "includes_charger",
  "includes_battery"
];

export const TABLET_SCHEMA: ListingItemSchema = {
  category: "Electronics & Gadgets",
  subcategory: "Phones & Mobile Devices",
  itemType: "Tablet",
  fields: [
    // Device Identity
    {
      key: "brand",
      label: "Brand",
      type: "select",
      required: true,
      options: [
        "Apple",
        "Samsung",
        "Huawei",
        "Lenovo",
        "Xiaomi",
        "Amazon",
        "Microsoft",
        "Tecno",
        "Infinix",
        "Other"
      ]
    },
    {
      key: "model",
      label: "Model",
      type: "text",
      required: true,
      placeholder: "e.g. iPad 9th Gen, Galaxy Tab A8"
    },
    {
      key: "series_variant",
      label: "Series / Variant",
      type: "text",
      advanced: true,
      placeholder: "e.g. Air, Pro, Lite, 5G"
    },
    {
      key: "color",
      label: "Color",
      type: "text",
      required: true,
      placeholder: "e.g. Black, Silver, Gray"
    },
    {
      key: "os",
      label: "Operating System",
      type: "select",
      required: true,
      options: ["Android", "iPadOS", "Windows", "Other"]
    },
    {
      key: "release_year",
      label: "Release Year",
      type: "number",
      advanced: true,
      placeholder: "e.g. 2022"
    },

    // Storage & Performance
    {
      key: "storage",
      label: "Storage Capacity",
      type: "select",
      required: true,
      options: ["16GB", "32GB", "64GB", "128GB", "256GB", "512GB", "1TB"]
    },
    {
      key: "ram",
      label: "RAM",
      type: "select",
      advanced: true,
      options: ["2GB", "3GB", "4GB", "6GB", "8GB", "12GB", "16GB", "Other"]
    },
    {
      key: "chipset",
      label: "Processor / Chipset",
      type: "text",
      advanced: true,
      placeholder: "e.g. Snapdragon 695, Apple A14, M1"
    },
    {
      key: "screen_size",
      label: "Screen Size",
      type: "text",
      required: true,
      placeholder: 'e.g. 10.2", 11"'
    },
    {
      key: "display_type",
      label: "Display Type",
      type: "select",
      advanced: true,
      options: ["LCD", "IPS LCD", "OLED", "AMOLED", "Retina", "Not Sure"]
    },
    {
      key: "refresh_rate",
      label: "Refresh Rate",
      type: "select",
      advanced: true,
      options: ["60Hz", "90Hz", "120Hz", "144Hz", "Not Sure"]
    },

    // Connectivity
    {
      key: "connectivity_type",
      label: "Connectivity Type",
      type: "select",
      required: true,
      options: ["Wi-Fi Only", "Wi-Fi + Cellular"]
    },
    {
      key: "network_type",
      label: "Network Support",
      type: "multiselect",
      advanced: true,
      options: ["3G", "4G", "5G"]
    },
    {
      key: "sim_type",
      label: "SIM Type",
      type: "select",
      advanced: true,
      options: ["Single SIM", "eSIM", "Single SIM + eSIM", "Not Applicable"]
    },
    {
      key: "network_status",
      label: "Network Status",
      type: "select",
      advanced: true,
      options: [
        "Factory Unlocked",
        "Works on TNM",
        "Works on Airtel",
        "Works on TNM & Airtel",
        "Carrier Locked",
        "Not Sure",
        "Not Applicable"
      ]
    },
    {
      key: "wifi_working",
      label: "Wi-Fi Working",
      type: "boolean",
      required: true
    },
    {
      key: "bluetooth_working",
      label: "Bluetooth Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "gps_working",
      label: "GPS Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "nfc_available",
      label: "NFC Available",
      type: "boolean",
      advanced: true
    },

    // Tablet-Specific Features
    {
      key: "stylus_support",
      label: "Stylus Support",
      type: "boolean",
      advanced: true
    },
    {
      key: "stylus_included",
      label: "Stylus Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "keyboard_support",
      label: "Keyboard Support",
      type: "boolean",
      advanced: true
    },
    {
      key: "keyboard_included",
      label: "Keyboard Included",
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
      key: "screen_condition",
      label: "Screen Condition",
      type: "select",
      required: true,
      options: [
        "Clean",
        "Minor Scratches",
        "Noticeable Scratches",
        "Cracked",
        "Replaced Screen"
      ]
    },
    {
      key: "back_condition",
      label: "Back Condition",
      type: "select",
      advanced: true,
      options: ["Like New", "Very Good", "Good", "Fair", "Damaged"]
    },
    {
      key: "frame_condition",
      label: "Frame / Edges Condition",
      type: "select",
      advanced: true,
      options: ["Like New", "Very Good", "Good", "Fair", "Damaged"]
    },
    {
      key: "has_cracks",
      label: "Any Cracks?",
      type: "boolean",
      required: true
    },
    {
      key: "has_scratches",
      label: "Visible Scratches?",
      type: "boolean",
      required: true
    },
    {
      key: "water_damage_signs",
      label: "Signs of Water Damage",
      type: "boolean",
      advanced: true
    },

    // Functionality Check
    {
      key: "touchscreen_working",
      label: "Touch Screen Working Properly",
      type: "boolean",
      required: true
    },
    {
      key: "front_camera_working",
      label: "Front Camera Working",
      type: "boolean",
      required: true
    },
    {
      key: "back_camera_working",
      label: "Back Camera Working",
      type: "boolean",
      required: true
    },
    {
      key: "speaker_working",
      label: "Speaker Working",
      type: "boolean",
      required: true
    },
    {
      key: "microphone_working",
      label: "Microphone Working",
      type: "boolean",
      required: true
    },
    {
      key: "charging_port_working",
      label: "Charging Port Working",
      type: "boolean",
      required: true
    },
    {
      key: "buttons_working",
      label: "Buttons Working",
      type: "boolean",
      required: true
    },
    {
      key: "face_id_fingerprint",
      label: "Face ID / Fingerprint",
      type: "select",
      advanced: true,
      options: [
        "Fully Working",
        "Partially Working",
        "Not Working",
        "Not Available"
      ]
    },
    {
      key: "headphone_jack_working",
      label: "Headphone Jack Working",
      type: "boolean",
      advanced: true
    },

    // Battery
    {
      key: "battery_condition",
      label: "Battery Condition",
      type: "select",
      required: true,
      options: ["Excellent", "Good", "Fair", "Weak", "Needs Replacement"]
    },
    {
      key: "battery_health_percent",
      label: "Battery Health %",
      type: "number",
      advanced: true,
      placeholder: "e.g. 89"
    },
    {
      key: "battery_backup",
      label: "Battery Backup",
      type: "select",
      required: true,
      options: [
        "Full Day",
        "Half Day to Full Day",
        "Few Hours",
        "Drains Fast",
        "Not Sure"
      ]
    },
    {
      key: "battery_replaced",
      label: "Battery Ever Replaced?",
      type: "boolean",
      advanced: true
    },
    {
      key: "fast_charging_supported",
      label: "Fast Charging Supported",
      type: "boolean",
      advanced: true
    },

    // What's Included
    {
      key: "includes_charger",
      label: "Charger Included",
      type: "boolean",
      required: true
    },
    {
      key: "includes_cable",
      label: "Cable Included",
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
      key: "includes_case",
      label: "Case / Cover Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "accessories_notes",
      label: "Other Included Accessories",
      type: "text",
      advanced: true,
      placeholder: "e.g. Stand, keyboard cover, stylus"
    },

    // Ownership / Safety
    {
      key: "icloud_frp_status",
      label: "iCloud / FRP Status",
      type: "select",
      required: true,
      options: [
        "No Lock / Safe to Reset",
        "iCloud Removed",
        "FRP Removed",
        "Locked",
        "Not Sure"
      ]
    },
    {
      key: "previous_account_removed",
      label: "Previous Account Removed",
      type: "boolean",
      required: true
    },
    {
      key: "repair_history",
      label: "Has It Been Repaired Before?",
      type: "boolean",
      advanced: true
    },
    {
      key: "replacement_parts",
      label: "Any Replaced Parts?",
      type: "text",
      advanced: true,
      placeholder: "e.g. Screen replaced, battery changed"
    },
    {
      key: "warranty_remaining",
      label: "Warranty Remaining",
      type: "boolean",
      advanced: true
    },
    {
      key: "proof_of_ownership",
      label: "Proof of Ownership Available",
      type: "boolean",
      advanced: true
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
      placeholder: "e.g. Used for 1 year"
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

export const TABLET_FIELD_GROUPS = [
  {
    title: "Device Identity",
    keys: ["brand", "model", "series_variant", "color", "os", "release_year"]
  },
  {
    title: "Storage & Performance",
    keys: ["storage", "ram", "chipset", "screen_size", "display_type", "refresh_rate"]
  },
  {
    title: "Connectivity",
    keys: [
      "connectivity_type",
      "network_type",
      "sim_type",
      "network_status",
      "wifi_working",
      "bluetooth_working",
      "gps_working",
      "nfc_available"
    ]
  },
  {
    title: "Tablet-Specific Features",
    keys: ["stylus_support", "stylus_included", "keyboard_support", "keyboard_included"]
  },
  {
    title: "Physical Condition",
    keys: [
      "body_condition",
      "screen_condition",
      "back_condition",
      "frame_condition",
      "has_cracks",
      "has_scratches",
      "water_damage_signs"
    ]
  },
  {
    title: "Functionality Check",
    keys: [
      "touchscreen_working",
      "front_camera_working",
      "back_camera_working",
      "speaker_working",
      "microphone_working",
      "charging_port_working",
      "buttons_working",
      "face_id_fingerprint",
      "headphone_jack_working"
    ]
  },
  {
    title: "Battery",
    keys: [
      "battery_condition",
      "battery_health_percent",
      "battery_backup",
      "battery_replaced",
      "fast_charging_supported"
    ]
  },
  {
    title: "What's Included",
    keys: [
      "includes_charger",
      "includes_cable",
      "includes_box",
      "includes_receipt",
      "includes_case",
      "accessories_notes"
    ]
  },
  {
    title: "Ownership / Safety",
    keys: [
      "icloud_frp_status",
      "previous_account_removed",
      "repair_history",
      "replacement_parts",
      "warranty_remaining",
      "proof_of_ownership"
    ]
  },
  {
    title: "Extra Notes",
    keys: ["known_faults", "usage_history", "reason_for_selling"]
  }
];

export const TABLET_REQUIRED_KEYS = [
  "brand",
  "model",
  "color",
  "os",
  "storage",
  "screen_size",
  "connectivity_type",
  "wifi_working",
  "body_condition",
  "screen_condition",
  "has_cracks",
  "has_scratches",
  "touchscreen_working",
  "front_camera_working",
  "back_camera_working",
  "speaker_working",
  "microphone_working",
  "charging_port_working",
  "buttons_working",
  "battery_condition",
  "battery_backup",
  "includes_charger",
  "icloud_frp_status",
  "previous_account_removed"
];

export const SMARTWATCH_FITNESS_BAND_SCHEMA: ListingItemSchema = {
  category: "Electronics & Gadgets",
  subcategory: "Phones & Mobile Devices",
  itemType: "Smartwatch / Fitness Band",
  fields: [
    // Device Identity
    {
      key: "device_type",
      label: "Device Type",
      type: "select",
      required: true,
      options: ["Smartwatch", "Fitness Band"]
    },
    {
      key: "brand",
      label: "Brand",
      type: "select",
      required: true,
      options: [
        "Apple",
        "Samsung",
        "Huawei",
        "Xiaomi",
        "Amazfit",
        "Fitbit",
        "Garmin",
        "Noise",
        "Oraimo",
        "Other"
      ]
    },
    {
      key: "model",
      label: "Model",
      type: "text",
      required: true,
      placeholder: "e.g. Apple Watch Series 7, Mi Band 8"
    },
    {
      key: "series_variant",
      label: "Series / Variant",
      type: "text",
      advanced: true,
      placeholder: "e.g. GPS, GPS + Cellular, Pro"
    },
    {
      key: "color",
      label: "Color",
      type: "text",
      required: true,
      placeholder: "e.g. Black, Silver, Pink"
    },
    {
      key: "case_size",
      label: "Case / Screen Size",
      type: "text",
      advanced: true,
      placeholder: 'e.g. 41mm, 44mm, 1.62"'
    },

    // Compatibility & Connectivity
    {
      key: "compatible_with",
      label: "Compatible With",
      type: "select",
      required: true,
      options: ["Android", "iPhone (iOS)", "Android & iPhone", "Not Sure"]
    },
    {
      key: "connectivity",
      label: "Connectivity",
      type: "multiselect",
      required: true,
      options: ["Bluetooth", "Wi-Fi", "GPS", "Cellular / eSIM", "NFC"]
    },
    {
      key: "bluetooth_working",
      label: "Bluetooth Working",
      type: "boolean",
      required: true
    },
    {
      key: "wifi_working",
      label: "Wi-Fi Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "gps_working",
      label: "GPS Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "cellular_supported",
      label: "Cellular / eSIM Supported",
      type: "boolean",
      advanced: true
    },
    {
      key: "nfc_available",
      label: "NFC Available",
      type: "boolean",
      advanced: true
    },

    // Display & Build
    {
      key: "display_type",
      label: "Display Type",
      type: "select",
      advanced: true,
      options: ["LCD", "OLED", "AMOLED", "Retina", "Not Sure"]
    },
    {
      key: "body_condition",
      label: "Body Condition",
      type: "select",
      required: true,
      options: ["Like New", "Very Good", "Good", "Fair", "Damaged"]
    },
    {
      key: "screen_condition",
      label: "Screen Condition",
      type: "select",
      required: true,
      options: [
        "Clean",
        "Minor Scratches",
        "Noticeable Scratches",
        "Cracked",
        "Replaced Screen"
      ]
    },
    {
      key: "strap_condition",
      label: "Strap / Band Condition",
      type: "select",
      required: true,
      options: ["Like New", "Very Good", "Good", "Fair", "Damaged", "Not Included"]
    },
    {
      key: "has_cracks",
      label: "Any Cracks?",
      type: "boolean",
      required: true
    },
    {
      key: "has_scratches",
      label: "Visible Scratches?",
      type: "boolean",
      required: true
    },
    {
      key: "water_damage_signs",
      label: "Signs of Water Damage",
      type: "boolean",
      advanced: true
    },

    // Functionality Check
    {
      key: "touchscreen_working",
      label: "Touch Screen Working Properly",
      type: "boolean",
      required: true
    },
    {
      key: "buttons_working",
      label: "Buttons / Crown Working",
      type: "boolean",
      required: true
    },
    {
      key: "speaker_working",
      label: "Speaker Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "microphone_working",
      label: "Microphone Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "vibration_working",
      label: "Vibration Working",
      type: "boolean",
      required: true
    },
    {
      key: "heart_rate_sensor_working",
      label: "Heart Rate Sensor Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "step_tracking_working",
      label: "Step Tracking Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "sleep_tracking_working",
      label: "Sleep Tracking Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "spo2_working",
      label: "SpO2 / Blood Oxygen Working",
      type: "boolean",
      advanced: true
    },

    // Battery
    {
      key: "battery_condition",
      label: "Battery Condition",
      type: "select",
      required: true,
      options: ["Excellent", "Good", "Fair", "Weak", "Needs Replacement"]
    },
    {
      key: "battery_backup",
      label: "Battery Backup",
      type: "select",
      required: true,
      options: [
        "Several Days",
        "2-3 Days",
        "1 Day",
        "Less Than a Day",
        "Drains Fast",
        "Not Sure"
      ]
    },
    {
      key: "battery_replaced",
      label: "Battery Ever Replaced?",
      type: "boolean",
      advanced: true
    },

    // What's Included
    {
      key: "includes_charger",
      label: "Charger Included",
      type: "boolean",
      required: true
    },
    {
      key: "includes_cable",
      label: "Charging Cable Included",
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
      key: "extra_strap_included",
      label: "Extra Strap Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "accessories_notes",
      label: "Other Included Accessories",
      type: "text",
      advanced: true,
      placeholder: "e.g. Extra strap, dock"
    },

    // Ownership / Safety
    {
      key: "account_lock_status",
      label: "Account Lock Status",
      type: "select",
      required: true,
      options: [
        "No Lock / Safe to Reset",
        "Account Removed",
        "Locked",
        "Not Sure"
      ]
    },
    {
      key: "previous_account_removed",
      label: "Previous Account Removed",
      type: "boolean",
      required: true
    },
    {
      key: "repair_history",
      label: "Has It Been Repaired Before?",
      type: "boolean",
      advanced: true
    },
    {
      key: "replacement_parts",
      label: "Any Replaced Parts?",
      type: "text",
      advanced: true,
      placeholder: "e.g. Screen replaced, strap changed"
    },
    {
      key: "proof_of_ownership",
      label: "Proof of Ownership Available",
      type: "boolean",
      advanced: true
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
      placeholder: "e.g. Used for 6 months"
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

export const SMARTWATCH_FITNESS_BAND_FIELD_GROUPS = [
  {
    title: "Device Identity",
    keys: ["device_type", "brand", "model", "series_variant", "color", "case_size"]
  },
  {
    title: "Compatibility & Connectivity",
    keys: [
      "compatible_with",
      "connectivity",
      "bluetooth_working",
      "wifi_working",
      "gps_working",
      "cellular_supported",
      "nfc_available"
    ]
  },
  {
    title: "Display & Build",
    keys: [
      "display_type",
      "body_condition",
      "screen_condition",
      "strap_condition",
      "has_cracks",
      "has_scratches",
      "water_damage_signs"
    ]
  },
  {
    title: "Functionality Check",
    keys: [
      "touchscreen_working",
      "buttons_working",
      "speaker_working",
      "microphone_working",
      "vibration_working",
      "heart_rate_sensor_working",
      "step_tracking_working",
      "sleep_tracking_working",
      "spo2_working"
    ]
  },
  {
    title: "Battery",
    keys: ["battery_condition", "battery_backup", "battery_replaced"]
  },
  {
    title: "What's Included",
    keys: [
      "includes_charger",
      "includes_cable",
      "includes_box",
      "includes_receipt",
      "extra_strap_included",
      "accessories_notes"
    ]
  },
  {
    title: "Ownership / Safety",
    keys: [
      "account_lock_status",
      "previous_account_removed",
      "repair_history",
      "replacement_parts",
      "proof_of_ownership"
    ]
  },
  {
    title: "Extra Notes",
    keys: ["known_faults", "usage_history", "reason_for_selling"]
  }
];

export const SMARTWATCH_FITNESS_BAND_REQUIRED_KEYS = [
  "device_type",
  "brand",
  "model",
  "color",
  "compatible_with",
  "connectivity",
  "bluetooth_working",
  "body_condition",
  "screen_condition",
  "strap_condition",
  "has_cracks",
  "has_scratches",
  "touchscreen_working",
  "buttons_working",
  "vibration_working",
  "battery_condition",
  "battery_backup",
  "includes_charger",
  "account_lock_status",
  "previous_account_removed"
];

export const LAPTOP_SCHEMA: ListingItemSchema = {
  category: "Electronics & Gadgets",
  subcategory: "Computers",
  itemType: "Laptop",
  fields: [
    // Device Identity
    {
      key: "brand",
      label: "Brand",
      type: "select",
      required: true,
      options: [
        "HP",
        "Dell",
        "Lenovo",
        "Apple",
        "Asus",
        "Acer",
        "Microsoft",
        "MSI",
        "Samsung",
        "Huawei",
        "Toshiba",
        "Other"
      ]
    },
    {
      key: "model",
      label: "Model",
      type: "text",
      required: true,
      placeholder: "e.g. HP EliteBook 840 G5, MacBook Air M1"
    },
    {
      key: "series_variant",
      label: "Series / Variant",
      type: "text",
      advanced: true,
      placeholder: "e.g. ProBook, ThinkPad, XPS, Pavilion"
    },
    {
      key: "color",
      label: "Color",
      type: "text",
      required: true,
      placeholder: "e.g. Silver, Black, Gray"
    },
    {
      key: "release_year",
      label: "Release Year",
      type: "number",
      advanced: true,
      placeholder: "e.g. 2021"
    },

    // System & Performance
    {
      key: "operating_system",
      label: "Operating System",
      type: "select",
      required: true,
      options: ["Windows", "macOS", "Linux", "ChromeOS", "Other"]
    },
    {
      key: "processor",
      label: "Processor",
      type: "text",
      required: true,
      placeholder: "e.g. Intel Core i5 8th Gen, Ryzen 5 5500U, Apple M1"
    },
    {
      key: "ram",
      label: "RAM",
      type: "select",
      required: true,
      options: ["4GB", "8GB", "12GB", "16GB", "24GB", "32GB", "64GB", "Other"]
    },
    {
      key: "storage_capacity",
      label: "Storage Capacity",
      type: "select",
      required: true,
      options: ["128GB", "256GB", "512GB", "1TB", "2TB", "Other"]
    },
    {
      key: "storage_type",
      label: "Storage Type",
      type: "select",
      required: true,
      options: ["HDD", "SSD", "NVMe SSD", "eMMC", "Not Sure"]
    },
    {
      key: "graphics_type",
      label: "Graphics Type",
      type: "select",
      advanced: true,
      options: ["Integrated", "Dedicated", "Integrated + Dedicated", "Not Sure"]
    },
    {
      key: "gpu_model",
      label: "Graphics Card / GPU Model",
      type: "text",
      advanced: true,
      placeholder: "e.g. Intel Iris Xe, NVIDIA GTX 1650"
    },

    // Display
    {
      key: "screen_size",
      label: "Screen Size",
      type: "text",
      required: true,
      placeholder: 'e.g. 13.3", 14", 15.6"'
    },
    {
      key: "resolution",
      label: "Screen Resolution",
      type: "select",
      advanced: true,
      options: ["HD", "Full HD", "2K", "4K", "Retina", "Not Sure"]
    },
    {
      key: "display_condition",
      label: "Display Condition",
      type: "select",
      required: true,
      options: [
        "Clean",
        "Minor Scratches",
        "Noticeable Scratches",
        "Dead Pixels",
        "Lines / Spots",
        "Cracked",
        "Replaced Screen"
      ]
    },
    {
      key: "touchscreen",
      label: "Touchscreen",
      type: "boolean",
      advanced: true
    },
    {
      key: "refresh_rate",
      label: "Refresh Rate",
      type: "select",
      advanced: true,
      options: ["60Hz", "90Hz", "120Hz", "144Hz", "165Hz", "240Hz", "Not Sure"]
    },

    // Build & Physical Condition
    {
      key: "body_condition",
      label: "Body Condition",
      type: "select",
      required: true,
      options: ["Like New", "Very Good", "Good", "Fair", "Damaged"]
    },
    {
      key: "keyboard_condition",
      label: "Keyboard Condition",
      type: "select",
      required: true,
      options: ["Fully Working", "Some Keys Weak", "Some Keys Not Working", "Damaged"]
    },
    {
      key: "touchpad_condition",
      label: "Touchpad Condition",
      type: "select",
      required: true,
      options: ["Fully Working", "Partially Working", "Not Working", "Damaged"]
    },
    {
      key: "hinge_condition",
      label: "Hinge Condition",
      type: "select",
      required: true,
      options: ["Strong", "Good", "Loose", "Damaged"]
    },
    {
      key: "has_dents",
      label: "Visible Dents?",
      type: "boolean",
      advanced: true
    },
    {
      key: "has_scratches",
      label: "Visible Scratches?",
      type: "boolean",
      required: true
    },

    // Functionality Check
    {
      key: "wifi_working",
      label: "Wi-Fi Working",
      type: "boolean",
      required: true
    },
    {
      key: "bluetooth_working",
      label: "Bluetooth Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "webcam_working",
      label: "Webcam Working",
      type: "boolean",
      required: true
    },
    {
      key: "microphone_working",
      label: "Microphone Working",
      type: "boolean",
      required: true
    },
    {
      key: "speaker_working",
      label: "Speakers Working",
      type: "boolean",
      required: true
    },
    {
      key: "keyboard_working",
      label: "Keyboard Working",
      type: "boolean",
      required: true
    },
    {
      key: "touchpad_working",
      label: "Touchpad Working",
      type: "boolean",
      required: true
    },
    {
      key: "usb_ports_working",
      label: "USB Ports Working",
      type: "boolean",
      required: true
    },
    {
      key: "charging_port_working",
      label: "Charging Port Working",
      type: "boolean",
      required: true
    },
    {
      key: "headphone_jack_working",
      label: "Headphone Jack Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "hdmi_port_working",
      label: "HDMI Port Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "fingerprint_working",
      label: "Fingerprint Sensor Working",
      type: "boolean",
      advanced: true
    },

    // Battery & Power
    {
      key: "battery_condition",
      label: "Battery Condition",
      type: "select",
      required: true,
      options: ["Excellent", "Good", "Fair", "Weak", "Needs Replacement"]
    },
    {
      key: "battery_backup",
      label: "Battery Backup",
      type: "select",
      required: true,
      options: [
        "5+ Hours",
        "3-5 Hours",
        "1-3 Hours",
        "Less Than 1 Hour",
        "Only Works Plugged In",
        "Not Sure"
      ]
    },
    {
      key: "battery_replaced",
      label: "Battery Ever Replaced?",
      type: "boolean",
      advanced: true
    },
    {
      key: "charger_included",
      label: "Charger Included",
      type: "boolean",
      required: true
    },
    {
      key: "original_charger",
      label: "Original Charger",
      type: "boolean",
      advanced: true
    },

    // Ownership / Safety
    {
      key: "bios_password_status",
      label: "BIOS / Firmware Password Status",
      type: "select",
      required: true,
      options: [
        "No Password / Accessible",
        "Password Removed",
        "Password Locked",
        "Not Sure"
      ]
    },
    {
      key: "device_reset_ready",
      label: "Device Ready to Reset / New User Setup",
      type: "boolean",
      required: true
    },
    {
      key: "repair_history",
      label: "Has It Been Repaired Before?",
      type: "boolean",
      advanced: true
    },
    {
      key: "replacement_parts",
      label: "Any Replaced Parts?",
      type: "text",
      advanced: true,
      placeholder: "e.g. Battery changed, keyboard replaced"
    },
    {
      key: "proof_of_ownership",
      label: "Proof of Ownership Available",
      type: "boolean",
      advanced: true
    },
    {
      key: "warranty_remaining",
      label: "Warranty Remaining",
      type: "boolean",
      advanced: true
    },

    // What's Included
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
      key: "includes_bag",
      label: "Laptop Bag Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "includes_mouse",
      label: "Mouse Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "accessories_notes",
      label: "Other Included Accessories",
      type: "text",
      advanced: true,
      placeholder: "e.g. USB hub, cooling pad, dock"
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
      placeholder: "e.g. Used for school work for 2 years"
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

export const LAPTOP_FIELD_GROUPS = [
  {
    title: "Device Identity",
    keys: ["brand", "model", "series_variant", "color", "release_year"]
  },
  {
    title: "System & Performance",
    keys: [
      "operating_system",
      "processor",
      "ram",
      "storage_capacity",
      "storage_type",
      "graphics_type",
      "gpu_model"
    ]
  },
  {
    title: "Display",
    keys: [
      "screen_size",
      "resolution",
      "display_condition",
      "touchscreen",
      "refresh_rate"
    ]
  },
  {
    title: "Build & Physical Condition",
    keys: [
      "body_condition",
      "keyboard_condition",
      "touchpad_condition",
      "hinge_condition",
      "has_dents",
      "has_scratches"
    ]
  },
  {
    title: "Functionality Check",
    keys: [
      "wifi_working",
      "bluetooth_working",
      "webcam_working",
      "microphone_working",
      "speaker_working",
      "keyboard_working",
      "touchpad_working",
      "usb_ports_working",
      "charging_port_working",
      "headphone_jack_working",
      "hdmi_port_working",
      "fingerprint_working"
    ]
  },
  {
    title: "Battery & Power",
    keys: [
      "battery_condition",
      "battery_backup",
      "battery_replaced",
      "charger_included",
      "original_charger"
    ]
  },
  {
    title: "Ownership / Safety",
    keys: [
      "bios_password_status",
      "device_reset_ready",
      "repair_history",
      "replacement_parts",
      "proof_of_ownership",
      "warranty_remaining"
    ]
  },
  {
    title: "What's Included",
    keys: [
      "includes_box",
      "includes_receipt",
      "includes_bag",
      "includes_mouse",
      "accessories_notes"
    ]
  },
  {
    title: "Extra Notes",
    keys: ["known_faults", "usage_history", "reason_for_selling"]
  }
];

export const LAPTOP_REQUIRED_KEYS = [
  "brand",
  "model",
  "color",
  "operating_system",
  "processor",
  "ram",
  "storage_capacity",
  "storage_type",
  "screen_size",
  "display_condition",
  "body_condition",
  "keyboard_condition",
  "touchpad_condition",
  "hinge_condition",
  "has_scratches",
  "wifi_working",
  "webcam_working",
  "microphone_working",
  "speaker_working",
  "keyboard_working",
  "touchpad_working",
  "usb_ports_working",
  "charging_port_working",
  "battery_condition",
  "battery_backup",
  "charger_included",
  "bios_password_status",
  "device_reset_ready"
];

export const DESKTOP_COMPUTER_SCHEMA: ListingItemSchema = {
  category: "Electronics & Gadgets",
  subcategory: "Computers",
  itemType: "Desktop Computer",
  fields: [
    // Device Identity
    {
      key: "device_form",
      label: "Desktop Type",
      type: "select",
      required: true,
      options: ["Tower", "Small Form Factor", "All-in-One", "Mini PC", "Custom Build", "Other"]
    },
    {
      key: "brand",
      label: "Brand",
      type: "select",
      required: true,
      options: [
        "HP",
        "Dell",
        "Lenovo",
        "Apple",
        "Asus",
        "Acer",
        "MSI",
        "Intel",
        "Custom Build",
        "Other"
      ]
    },
    {
      key: "model",
      label: "Model",
      type: "text",
      required: true,
      placeholder: "e.g. OptiPlex 7050, EliteDesk 800 G4"
    },
    {
      key: "series_variant",
      label: "Series / Variant",
      type: "text",
      advanced: true,
      placeholder: "e.g. OptiPlex, ProDesk, iMac"
    },
    {
      key: "color",
      label: "Color",
      type: "text",
      advanced: true,
      placeholder: "e.g. Black, Silver"
    },
    {
      key: "release_year",
      label: "Release Year",
      type: "number",
      advanced: true,
      placeholder: "e.g. 2020"
    },

    // System & Performance
    {
      key: "operating_system",
      label: "Operating System",
      type: "select",
      required: true,
      options: ["Windows", "macOS", "Linux", "ChromeOS", "Other"]
    },
    {
      key: "processor",
      label: "Processor",
      type: "text",
      required: true,
      placeholder: "e.g. Intel Core i5 8th Gen, Ryzen 5 5600G"
    },
    {
      key: "ram",
      label: "RAM",
      type: "select",
      required: true,
      options: ["4GB", "8GB", "12GB", "16GB", "24GB", "32GB", "64GB", "128GB", "Other"]
    },
    {
      key: "storage_capacity",
      label: "Storage Capacity",
      type: "select",
      required: true,
      options: ["128GB", "256GB", "512GB", "1TB", "2TB", "4TB", "Other"]
    },
    {
      key: "storage_type",
      label: "Storage Type",
      type: "select",
      required: true,
      options: ["HDD", "SSD", "NVMe SSD", "HDD + SSD", "Not Sure"]
    },
    {
      key: "graphics_type",
      label: "Graphics Type",
      type: "select",
      advanced: true,
      options: ["Integrated", "Dedicated", "Integrated + Dedicated", "Not Sure"]
    },
    {
      key: "gpu_model",
      label: "Graphics Card / GPU Model",
      type: "text",
      advanced: true,
      placeholder: "e.g. GTX 1650, Radeon RX 580, Intel UHD 630"
    },

    // Monitor & Display Setup
    {
      key: "monitor_included",
      label: "Monitor Included",
      type: "boolean",
      required: true
    },
    {
      key: "monitor_size",
      label: "Monitor Size",
      type: "text",
      advanced: true,
      placeholder: 'e.g. 19", 22", 24"'
    },
    {
      key: "monitor_resolution",
      label: "Monitor Resolution",
      type: "select",
      advanced: true,
      options: ["HD", "Full HD", "2K", "4K", "Not Sure"]
    },
    {
      key: "monitor_condition",
      label: "Monitor Condition",
      type: "select",
      advanced: true,
      options: [
        "Clean",
        "Minor Scratches",
        "Noticeable Scratches",
        "Dead Pixels",
        "Lines / Spots",
        "Cracked",
        "Not Included"
      ]
    },

    // Build & Physical Condition
    {
      key: "body_condition",
      label: "System Unit Condition",
      type: "select",
      required: true,
      options: ["Like New", "Very Good", "Good", "Fair", "Damaged"]
    },
    {
      key: "case_condition",
      label: "Case / Chassis Condition",
      type: "select",
      advanced: true,
      options: ["Like New", "Very Good", "Good", "Fair", "Damaged"]
    },
    {
      key: "has_dents",
      label: "Visible Dents?",
      type: "boolean",
      advanced: true
    },
    {
      key: "has_scratches",
      label: "Visible Scratches?",
      type: "boolean",
      required: true
    },

    // Functionality Check
    {
      key: "boots_normally",
      label: "Boots Normally",
      type: "boolean",
      required: true
    },
    {
      key: "wifi_working",
      label: "Wi-Fi Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "bluetooth_working",
      label: "Bluetooth Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "usb_ports_working",
      label: "USB Ports Working",
      type: "boolean",
      required: true
    },
    {
      key: "audio_jack_working",
      label: "Audio Jack Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "hdmi_port_working",
      label: "HDMI Port Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "ethernet_port_working",
      label: "Ethernet Port Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "dvd_drive_available",
      label: "DVD Drive Available",
      type: "boolean",
      advanced: true
    },
    {
      key: "dvd_drive_working",
      label: "DVD Drive Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "all_in_one_webcam_working",
      label: "Built-in Webcam Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "all_in_one_speakers_working",
      label: "Built-in Speakers Working",
      type: "boolean",
      advanced: true
    },

    // Power & Cooling
    {
      key: "power_cable_included",
      label: "Power Cable Included",
      type: "boolean",
      required: true
    },
    {
      key: "power_supply_condition",
      label: "Power Supply Condition",
      type: "select",
      advanced: true,
      options: ["Excellent", "Good", "Fair", "Weak / Unstable", "Not Sure"]
    },
    {
      key: "cooling_fans_working",
      label: "Cooling Fans Working",
      type: "boolean",
      required: true
    },
    {
      key: "overheating_issue",
      label: "Any Overheating Issue?",
      type: "boolean",
      advanced: true
    },

    // Ownership / Safety
    {
      key: "bios_password_status",
      label: "BIOS / Firmware Password Status",
      type: "select",
      required: true,
      options: [
        "No Password / Accessible",
        "Password Removed",
        "Password Locked",
        "Not Sure"
      ]
    },
    {
      key: "device_reset_ready",
      label: "Device Ready to Reset / New User Setup",
      type: "boolean",
      required: true
    },
    {
      key: "repair_history",
      label: "Has It Been Repaired Before?",
      type: "boolean",
      advanced: true
    },
    {
      key: "replacement_parts",
      label: "Any Replaced Parts?",
      type: "text",
      advanced: true,
      placeholder: "e.g. SSD changed, RAM upgraded, PSU replaced"
    },
    {
      key: "proof_of_ownership",
      label: "Proof of Ownership Available",
      type: "boolean",
      advanced: true
    },
    {
      key: "warranty_remaining",
      label: "Warranty Remaining",
      type: "boolean",
      advanced: true
    },

    // What's Included
    {
      key: "keyboard_included",
      label: "Keyboard Included",
      type: "boolean",
      required: true
    },
    {
      key: "mouse_included",
      label: "Mouse Included",
      type: "boolean",
      required: true
    },
    {
      key: "monitor_cable_included",
      label: "Monitor Cable Included",
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
      placeholder: "e.g. UPS cable, adapter, extra keyboard"
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
      placeholder: "e.g. Used for office work for 2 years"
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

export const DESKTOP_COMPUTER_FIELD_GROUPS = [
  {
    title: "Device Identity",
    keys: ["device_form", "brand", "model", "series_variant", "color", "release_year"]
  },
  {
    title: "System & Performance",
    keys: [
      "operating_system",
      "processor",
      "ram",
      "storage_capacity",
      "storage_type",
      "graphics_type",
      "gpu_model"
    ]
  },
  {
    title: "Monitor & Display Setup",
    keys: ["monitor_included", "monitor_size", "monitor_resolution", "monitor_condition"]
  },
  {
    title: "Build & Physical Condition",
    keys: ["body_condition", "case_condition", "has_dents", "has_scratches"]
  },
  {
    title: "Functionality Check",
    keys: [
      "boots_normally",
      "wifi_working",
      "bluetooth_working",
      "usb_ports_working",
      "audio_jack_working",
      "hdmi_port_working",
      "ethernet_port_working",
      "dvd_drive_available",
      "dvd_drive_working",
      "all_in_one_webcam_working",
      "all_in_one_speakers_working"
    ]
  },
  {
    title: "Power & Cooling",
    keys: [
      "power_cable_included",
      "power_supply_condition",
      "cooling_fans_working",
      "overheating_issue"
    ]
  },
  {
    title: "Ownership / Safety",
    keys: [
      "bios_password_status",
      "device_reset_ready",
      "repair_history",
      "replacement_parts",
      "proof_of_ownership",
      "warranty_remaining"
    ]
  },
  {
    title: "What's Included",
    keys: [
      "keyboard_included",
      "mouse_included",
      "monitor_cable_included",
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

export const DESKTOP_COMPUTER_REQUIRED_KEYS = [
  "device_form",
  "brand",
  "model",
  "operating_system",
  "processor",
  "ram",
  "storage_capacity",
  "storage_type",
  "monitor_included",
  "body_condition",
  "has_scratches",
  "boots_normally",
  "usb_ports_working",
  "power_cable_included",
  "cooling_fans_working",
  "bios_password_status",
  "device_reset_ready",
  "keyboard_included",
  "mouse_included"
];

export const MONITOR_SCHEMA: ListingItemSchema = {
  category: "Electronics & Gadgets",
  subcategory: "Computers",
  itemType: "Monitor",
  fields: [
    // Device Identity
    {
      key: "monitor_type",
      label: "Monitor Type",
      type: "select",
      required: true,
      options: ["Flat", "Curved", "Portable Monitor", "All-in-One Display", "Other"]
    },
    {
      key: "brand",
      label: "Brand",
      type: "select",
      required: true,
      options: [
        "HP",
        "Dell",
        "Lenovo",
        "Samsung",
        "LG",
        "Acer",
        "Asus",
        "MSI",
        "AOC",
        "ViewSonic",
        "BenQ",
        "Apple",
        "Other"
      ]
    },
    {
      key: "model",
      label: "Model",
      type: "text",
      required: true,
      placeholder: "e.g. Dell P2419H, Samsung Odyssey G5"
    },
    {
      key: "color",
      label: "Color",
      type: "text",
      advanced: true,
      placeholder: "e.g. Black, Silver, White"
    },
    {
      key: "release_year",
      label: "Release Year",
      type: "number",
      advanced: true,
      placeholder: "e.g. 2021"
    },

    // Display Specs
    {
      key: "screen_size",
      label: "Screen Size",
      type: "text",
      required: true,
      placeholder: 'e.g. 19", 22", 24", 27"'
    },
    {
      key: "resolution",
      label: "Resolution",
      type: "select",
      required: true,
      options: ["HD", "Full HD", "2K", "4K", "Retina", "Not Sure"]
    },
    {
      key: "panel_type",
      label: "Panel Type",
      type: "select",
      advanced: true,
      options: ["TN", "IPS", "VA", "OLED", "AMOLED", "Not Sure"]
    },
    {
      key: "refresh_rate",
      label: "Refresh Rate",
      type: "select",
      advanced: true,
      options: ["60Hz", "75Hz", "90Hz", "100Hz", "120Hz", "144Hz", "165Hz", "240Hz", "Not Sure"]
    },
    {
      key: "aspect_ratio",
      label: "Aspect Ratio",
      type: "select",
      advanced: true,
      options: ["16:9", "16:10", "21:9", "32:9", "Not Sure"]
    },
    {
      key: "touchscreen",
      label: "Touchscreen",
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
      key: "screen_condition",
      label: "Screen Condition",
      type: "select",
      required: true,
      options: [
        "Clean",
        "Minor Scratches",
        "Noticeable Scratches",
        "Dead Pixels",
        "Lines / Spots",
        "Cracked",
        "Replaced Panel"
      ]
    },
    {
      key: "stand_condition",
      label: "Stand Condition",
      type: "select",
      required: true,
      options: ["Like New", "Very Good", "Good", "Fair", "Damaged", "Not Included"]
    },
    {
      key: "has_cracks",
      label: "Any Cracks?",
      type: "boolean",
      required: true
    },
    {
      key: "has_scratches",
      label: "Visible Scratches?",
      type: "boolean",
      required: true
    },

    // Functionality Check
    {
      key: "display_working",
      label: "Display Working Properly",
      type: "boolean",
      required: true
    },
    {
      key: "dead_pixels_present",
      label: "Dead Pixels Present",
      type: "boolean",
      required: true
    },
    {
      key: "backlight_issue",
      label: "Backlight / Brightness Issue",
      type: "boolean",
      advanced: true
    },
    {
      key: "hdmi_port_working",
      label: "HDMI Port Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "displayport_working",
      label: "DisplayPort Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "vga_port_working",
      label: "VGA Port Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "dvi_port_working",
      label: "DVI Port Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "usb_ports_working",
      label: "USB Ports Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "built_in_speakers_working",
      label: "Built-in Speakers Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "buttons_working",
      label: "Buttons / Menu Controls Working",
      type: "boolean",
      required: true
    },

    // Mounting & Ergonomics
    {
      key: "vesa_mount_support",
      label: "VESA Mount Support",
      type: "boolean",
      advanced: true
    },
    {
      key: "height_adjustable",
      label: "Height Adjustable",
      type: "boolean",
      advanced: true
    },
    {
      key: "tilt_adjustable",
      label: "Tilt Adjustable",
      type: "boolean",
      advanced: true
    },
    {
      key: "pivot_support",
      label: "Pivot / Rotate Support",
      type: "boolean",
      advanced: true
    },

    // Power & Cables
    {
      key: "power_cable_included",
      label: "Power Cable Included",
      type: "boolean",
      required: true
    },
    {
      key: "hdmi_cable_included",
      label: "HDMI Cable Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "displayport_cable_included",
      label: "DisplayPort Cable Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "vga_cable_included",
      label: "VGA Cable Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "adapter_included",
      label: "Power Adapter Included",
      type: "boolean",
      advanced: true
    },

    // Ownership / Extra
    {
      key: "repair_history",
      label: "Has It Been Repaired Before?",
      type: "boolean",
      advanced: true
    },
    {
      key: "replacement_parts",
      label: "Any Replaced Parts?",
      type: "text",
      advanced: true,
      placeholder: "e.g. Panel changed, stand replaced"
    },
    {
      key: "proof_of_ownership",
      label: "Proof of Ownership Available",
      type: "boolean",
      advanced: true
    },
    {
      key: "warranty_remaining",
      label: "Warranty Remaining",
      type: "boolean",
      advanced: true
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
      placeholder: "e.g. Used for office work for 1 year"
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

export const MONITOR_FIELD_GROUPS = [
  {
    title: "Device Identity",
    keys: ["monitor_type", "brand", "model", "color", "release_year"]
  },
  {
    title: "Display Specs",
    keys: [
      "screen_size",
      "resolution",
      "panel_type",
      "refresh_rate",
      "aspect_ratio",
      "touchscreen"
    ]
  },
  {
    title: "Physical Condition",
    keys: [
      "body_condition",
      "screen_condition",
      "stand_condition",
      "has_cracks",
      "has_scratches"
    ]
  },
  {
    title: "Functionality Check",
    keys: [
      "display_working",
      "dead_pixels_present",
      "backlight_issue",
      "hdmi_port_working",
      "displayport_working",
      "vga_port_working",
      "dvi_port_working",
      "usb_ports_working",
      "built_in_speakers_working",
      "buttons_working"
    ]
  },
  {
    title: "Mounting & Ergonomics",
    keys: [
      "vesa_mount_support",
      "height_adjustable",
      "tilt_adjustable",
      "pivot_support"
    ]
  },
  {
    title: "Power & Cables",
    keys: [
      "power_cable_included",
      "hdmi_cable_included",
      "displayport_cable_included",
      "vga_cable_included",
      "adapter_included"
    ]
  },
  {
    title: "Ownership / Extra",
    keys: [
      "repair_history",
      "replacement_parts",
      "proof_of_ownership",
      "warranty_remaining"
    ]
  },
  {
    title: "Extra Notes",
    keys: ["known_faults", "usage_history", "reason_for_selling"]
  }
];

export const MONITOR_REQUIRED_KEYS = [
  "monitor_type",
  "brand",
  "model",
  "screen_size",
  "resolution",
  "body_condition",
  "screen_condition",
  "stand_condition",
  "has_cracks",
  "has_scratches",
  "display_working",
  "dead_pixels_present",
  "buttons_working",
  "power_cable_included"
];

export const HEADPHONES_SCHEMA: ListingItemSchema = {
  category: "Electronics & Gadgets",
  subcategory: "Audio",
  itemType: "Headphones",
  fields: [
    // Device Identity
    {
      key: "headphone_type",
      label: "Headphone Type",
      type: "select",
      required: true,
      options: ["Over-Ear", "On-Ear", "Wired Headphones", "Wireless Headphones", "Gaming Headset", "Other"]
    },
    {
      key: "brand",
      label: "Brand",
      type: "select",
      required: true,
      options: [
        "Sony",
        "JBL",
        "Beats",
        "Apple",
        "Samsung",
        "Oraimo",
        "Anker",
        "Skullcandy",
        "Logitech",
        "Razer",
        "HyperX",
        "Other"
      ]
    },
    {
      key: "model",
      label: "Model",
      type: "text",
      required: true,
      placeholder: "e.g. Sony WH-1000XM4, JBL Tune 510BT"
    },
    {
      key: "color",
      label: "Color",
      type: "text",
      required: true,
      placeholder: "e.g. Black, Blue, White"
    },

    // Connectivity & Compatibility
    {
      key: "connection_type",
      label: "Connection Type",
      type: "select",
      required: true,
      options: ["Wired", "Wireless", "Wired + Wireless"]
    },
    {
      key: "connector_type",
      label: "Connector Type",
      type: "select",
      advanced: true,
      options: ["3.5mm Jack", "USB-C", "Lightning", "USB", "Not Applicable", "Other"]
    },
    {
      key: "bluetooth_working",
      label: "Bluetooth Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "compatible_with",
      label: "Compatible With",
      type: "select",
      required: true,
      options: ["Android", "iPhone (iOS)", "Laptop / PC", "Android & iPhone", "Universal", "Not Sure"]
    },
    {
      key: "noise_cancellation",
      label: "Noise Cancellation",
      type: "select",
      advanced: true,
      options: ["Yes", "No", "Not Sure"]
    },
    {
      key: "microphone_available",
      label: "Built-in Microphone",
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
      key: "ear_cushion_condition",
      label: "Ear Cushion Condition",
      type: "select",
      required: true,
      options: ["Like New", "Very Good", "Good", "Worn Out", "Damaged", "Not Applicable"]
    },
    {
      key: "headband_condition",
      label: "Headband Condition",
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
      key: "left_side_working",
      label: "Left Side Working",
      type: "boolean",
      required: true
    },
    {
      key: "right_side_working",
      label: "Right Side Working",
      type: "boolean",
      required: true
    },
    {
      key: "sound_clear",
      label: "Sound Clear",
      type: "boolean",
      required: true
    },
    {
      key: "volume_controls_working",
      label: "Volume Controls Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "microphone_working",
      label: "Microphone Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "charging_port_working",
      label: "Charging Port Working",
      type: "boolean",
      advanced: true
    },

    // Battery
    {
      key: "battery_condition",
      label: "Battery Condition",
      type: "select",
      advanced: true,
      options: ["Excellent", "Good", "Fair", "Weak", "Needs Replacement", "Not Applicable"]
    },
    {
      key: "battery_backup",
      label: "Battery Backup",
      type: "select",
      advanced: true,
      options: [
        "10+ Hours",
        "5-10 Hours",
        "1-5 Hours",
        "Less Than 1 Hour",
        "Drains Fast",
        "Not Sure",
        "Not Applicable"
      ]
    },

    // What's Included
    {
      key: "includes_charging_cable",
      label: "Charging Cable Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "includes_audio_cable",
      label: "Audio Cable Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "includes_case",
      label: "Case / Pouch Included",
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
      placeholder: "e.g. Adapter, extra cable"
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
      placeholder: "e.g. Used for 6 months"
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

export const HEADPHONES_FIELD_GROUPS = [
  {
    title: "Device Identity",
    keys: ["headphone_type", "brand", "model", "color"]
  },
  {
    title: "Connectivity & Compatibility",
    keys: [
      "connection_type",
      "connector_type",
      "bluetooth_working",
      "compatible_with",
      "noise_cancellation",
      "microphone_available"
    ]
  },
  {
    title: "Physical Condition",
    keys: [
      "body_condition",
      "ear_cushion_condition",
      "headband_condition",
      "has_scratches",
      "has_cracks"
    ]
  },
  {
    title: "Functionality Check",
    keys: [
      "left_side_working",
      "right_side_working",
      "sound_clear",
      "volume_controls_working",
      "microphone_working",
      "charging_port_working"
    ]
  },
  {
    title: "Battery",
    keys: ["battery_condition", "battery_backup"]
  },
  {
    title: "What's Included",
    keys: [
      "includes_charging_cable",
      "includes_audio_cable",
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

export const HEADPHONES_REQUIRED_KEYS = [
  "headphone_type",
  "brand",
  "model",
  "color",
  "connection_type",
  "compatible_with",
  "body_condition",
  "ear_cushion_condition",
  "has_scratches",
  "has_cracks",
  "left_side_working",
  "right_side_working",
  "sound_clear"
];

export const EARBUDS_SCHEMA: ListingItemSchema = {
  category: "Electronics & Gadgets",
  subcategory: "Audio",
  itemType: "Earbuds",
  fields: [
    // Device Identity
    {
      key: "earbuds_type",
      label: "Earbuds Type",
      type: "select",
      required: true,
      options: ["True Wireless", "Neckband", "Wired Earbuds", "Gaming Earbuds", "Other"]
    },
    {
      key: "brand",
      label: "Brand",
      type: "select",
      required: true,
      options: [
        "Apple",
        "Samsung",
        "JBL",
        "Sony",
        "Oraimo",
        "Anker",
        "Xiaomi",
        "Redmi",
        "Huawei",
        "Beats",
        "Skullcandy",
        "Other"
      ]
    },
    {
      key: "model",
      label: "Model",
      type: "text",
      required: true,
      placeholder: "e.g. AirPods Pro, Galaxy Buds 2, Oraimo FreePods 4"
    },
    {
      key: "color",
      label: "Color",
      type: "text",
      required: true,
      placeholder: "e.g. White, Black, Blue"
    },

    // Connectivity & Compatibility
    {
      key: "connection_type",
      label: "Connection Type",
      type: "select",
      required: true,
      options: ["Wired", "Wireless", "Wired + Wireless"]
    },
    {
      key: "connector_type",
      label: "Connector Type",
      type: "select",
      advanced: true,
      options: ["3.5mm Jack", "USB-C", "Lightning", "Not Applicable", "Other"]
    },
    {
      key: "bluetooth_working",
      label: "Bluetooth Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "compatible_with",
      label: "Compatible With",
      type: "select",
      required: true,
      options: ["Android", "iPhone (iOS)", "Laptop / PC", "Android & iPhone", "Universal", "Not Sure"]
    },
    {
      key: "noise_cancellation",
      label: "Noise Cancellation",
      type: "select",
      advanced: true,
      options: ["Yes", "No", "Not Sure"]
    },
    {
      key: "microphone_available",
      label: "Built-in Microphone",
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
      key: "left_earbud_condition",
      label: "Left Earbud Condition",
      type: "select",
      required: true,
      options: ["Like New", "Very Good", "Good", "Fair", "Damaged", "Missing"]
    },
    {
      key: "right_earbud_condition",
      label: "Right Earbud Condition",
      type: "select",
      required: true,
      options: ["Like New", "Very Good", "Good", "Fair", "Damaged", "Missing"]
    },
    {
      key: "charging_case_condition",
      label: "Charging Case Condition",
      type: "select",
      advanced: true,
      options: ["Like New", "Very Good", "Good", "Fair", "Damaged", "Not Included", "Not Applicable"]
    },
    {
      key: "ear_tips_condition",
      label: "Ear Tips Condition",
      type: "select",
      advanced: true,
      options: ["Like New", "Very Good", "Good", "Worn Out", "Damaged", "Not Included", "Not Applicable"]
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
      key: "left_side_working",
      label: "Left Earbud Working",
      type: "boolean",
      required: true
    },
    {
      key: "right_side_working",
      label: "Right Earbud Working",
      type: "boolean",
      required: true
    },
    {
      key: "sound_clear",
      label: "Sound Clear",
      type: "boolean",
      required: true
    },
    {
      key: "touch_controls_working",
      label: "Touch / Button Controls Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "microphone_working",
      label: "Microphone Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "charging_case_working",
      label: "Charging Case Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "charging_port_working",
      label: "Charging Port Working",
      type: "boolean",
      advanced: true
    },

    // Battery
    {
      key: "battery_condition",
      label: "Battery Condition",
      type: "select",
      advanced: true,
      options: ["Excellent", "Good", "Fair", "Weak", "Needs Replacement", "Not Applicable"]
    },
    {
      key: "battery_backup",
      label: "Battery Backup",
      type: "select",
      advanced: true,
      options: [
        "8+ Hours",
        "4-8 Hours",
        "1-4 Hours",
        "Less Than 1 Hour",
        "Drains Fast",
        "Not Sure",
        "Not Applicable"
      ]
    },
    {
      key: "case_holds_charge",
      label: "Charging Case Holds Charge",
      type: "boolean",
      advanced: true
    },

    // What's Included
    {
      key: "includes_charging_cable",
      label: "Charging Cable Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "includes_case",
      label: "Charging Case Included",
      type: "boolean",
      required: true
    },
    {
      key: "includes_extra_ear_tips",
      label: "Extra Ear Tips Included",
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
      placeholder: "e.g. Silicone cover, hook, adapter"
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
      placeholder: "e.g. Used for 4 months"
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

export const EARBUDS_FIELD_GROUPS = [
  {
    title: "Device Identity",
    keys: ["earbuds_type", "brand", "model", "color"]
  },
  {
    title: "Connectivity & Compatibility",
    keys: [
      "connection_type",
      "connector_type",
      "bluetooth_working",
      "compatible_with",
      "noise_cancellation",
      "microphone_available"
    ]
  },
  {
    title: "Physical Condition",
    keys: [
      "body_condition",
      "left_earbud_condition",
      "right_earbud_condition",
      "charging_case_condition",
      "ear_tips_condition",
      "has_scratches",
      "has_cracks"
    ]
  },
  {
    title: "Functionality Check",
    keys: [
      "left_side_working",
      "right_side_working",
      "sound_clear",
      "touch_controls_working",
      "microphone_working",
      "charging_case_working",
      "charging_port_working"
    ]
  },
  {
    title: "Battery",
    keys: ["battery_condition", "battery_backup", "case_holds_charge"]
  },
  {
    title: "What's Included",
    keys: [
      "includes_charging_cable",
      "includes_case",
      "includes_extra_ear_tips",
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

export const EARBUDS_REQUIRED_KEYS = [
  "earbuds_type",
  "brand",
  "model",
  "color",
  "connection_type",
  "compatible_with",
  "body_condition",
  "left_earbud_condition",
  "right_earbud_condition",
  "has_scratches",
  "has_cracks",
  "left_side_working",
  "right_side_working",
  "sound_clear",
  "includes_case"
];

export const BLUETOOTH_SPEAKER_SCHEMA: ListingItemSchema = {
  category: "Electronics & Gadgets",
  subcategory: "Audio",
  itemType: "Bluetooth Speaker",
  fields: [
    // Device Identity
    {
      key: "speaker_type",
      label: "Speaker Type",
      type: "select",
      required: true,
      options: ["Portable", "Home Speaker", "Party Speaker", "Soundbar", "Mini Speaker", "Other"]
    },
    {
      key: "brand",
      label: "Brand",
      type: "select",
      required: true,
      options: [
        "JBL",
        "Sony",
        "Anker",
        "Oraimo",
        "Bose",
        "LG",
        "Samsung",
        "Xiaomi",
        "Harman Kardon",
        "Marshall",
        "Other"
      ]
    },
    {
      key: "model",
      label: "Model",
      type: "text",
      required: true,
      placeholder: "e.g. JBL Flip 5, Sony SRS-XB13"
    },
    {
      key: "color",
      label: "Color",
      type: "text",
      required: true,
      placeholder: "e.g. Black, Blue, Red"
    },

    // Connectivity & Features
    {
      key: "connection_type",
      label: "Connection Type",
      type: "select",
      required: true,
      options: ["Bluetooth Only", "Bluetooth + AUX", "Bluetooth + USB", "Bluetooth + AUX + USB", "Other"]
    },
    {
      key: "bluetooth_working",
      label: "Bluetooth Working",
      type: "boolean",
      required: true
    },
    {
      key: "aux_input_available",
      label: "AUX Input Available",
      type: "boolean",
      advanced: true
    },
    {
      key: "usb_input_available",
      label: "USB Input Available",
      type: "boolean",
      advanced: true
    },
    {
      key: "memory_card_support",
      label: "Memory Card Support",
      type: "boolean",
      advanced: true
    },
    {
      key: "fm_radio_available",
      label: "FM Radio Available",
      type: "boolean",
      advanced: true
    },
    {
      key: "microphone_input_available",
      label: "Microphone Input Available",
      type: "boolean",
      advanced: true
    },
    {
      key: "water_resistance",
      label: "Water Resistance",
      type: "select",
      advanced: true,
      options: ["Yes", "No", "Not Sure"]
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
      key: "grill_condition",
      label: "Speaker Grill Condition",
      type: "select",
      advanced: true,
      options: ["Like New", "Very Good", "Good", "Fair", "Damaged"]
    },
    {
      key: "buttons_condition",
      label: "Buttons Condition",
      type: "select",
      required: true,
      options: ["Fully Working", "Some Buttons Weak", "Some Buttons Not Working", "Damaged"]
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
      key: "sound_clear",
      label: "Sound Clear",
      type: "boolean",
      required: true
    },
    {
      key: "volume_output_good",
      label: "Volume Output Good",
      type: "boolean",
      required: true
    },
    {
      key: "bass_working_well",
      label: "Bass Working Well",
      type: "boolean",
      advanced: true
    },
    {
      key: "left_right_channels_ok",
      label: "Channels Working Properly",
      type: "boolean",
      advanced: true
    },
    {
      key: "buttons_working",
      label: "Buttons Working",
      type: "boolean",
      required: true
    },
    {
      key: "charging_port_working",
      label: "Charging Port Working",
      type: "boolean",
      required: true
    },
    {
      key: "aux_input_working",
      label: "AUX Input Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "usb_input_working",
      label: "USB Input Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "memory_card_working",
      label: "Memory Card Slot Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "fm_radio_working",
      label: "FM Radio Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "microphone_input_working",
      label: "Microphone Input Working",
      type: "boolean",
      advanced: true
    },

    // Battery
    {
      key: "battery_condition",
      label: "Battery Condition",
      type: "select",
      required: true,
      options: ["Excellent", "Good", "Fair", "Weak", "Needs Replacement", "Not Applicable"]
    },
    {
      key: "battery_backup",
      label: "Battery Backup",
      type: "select",
      required: true,
      options: [
        "10+ Hours",
        "5-10 Hours",
        "1-5 Hours",
        "Less Than 1 Hour",
        "Drains Fast",
        "Not Sure",
        "Not Applicable"
      ]
    },
    {
      key: "battery_replaced",
      label: "Battery Ever Replaced?",
      type: "boolean",
      advanced: true
    },

    // What's Included
    {
      key: "includes_charging_cable",
      label: "Charging Cable Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "includes_aux_cable",
      label: "AUX Cable Included",
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
      key: "includes_remote",
      label: "Remote Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "accessories_notes",
      label: "Other Included Accessories",
      type: "text",
      advanced: true,
      placeholder: "e.g. Strap, adapter, microphone"
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
      placeholder: "e.g. Used for home music for 8 months"
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

export const BLUETOOTH_SPEAKER_FIELD_GROUPS = [
  {
    title: "Device Identity",
    keys: ["speaker_type", "brand", "model", "color"]
  },
  {
    title: "Connectivity & Features",
    keys: [
      "connection_type",
      "bluetooth_working",
      "aux_input_available",
      "usb_input_available",
      "memory_card_support",
      "fm_radio_available",
      "microphone_input_available",
      "water_resistance"
    ]
  },
  {
    title: "Physical Condition",
    keys: [
      "body_condition",
      "grill_condition",
      "buttons_condition",
      "has_scratches",
      "has_cracks"
    ]
  },
  {
    title: "Functionality Check",
    keys: [
      "sound_clear",
      "volume_output_good",
      "bass_working_well",
      "left_right_channels_ok",
      "buttons_working",
      "charging_port_working",
      "aux_input_working",
      "usb_input_working",
      "memory_card_working",
      "fm_radio_working",
      "microphone_input_working"
    ]
  },
  {
    title: "Battery",
    keys: ["battery_condition", "battery_backup", "battery_replaced"]
  },
  {
    title: "What's Included",
    keys: [
      "includes_charging_cable",
      "includes_aux_cable",
      "includes_box",
      "includes_receipt",
      "includes_remote",
      "accessories_notes"
    ]
  },
  {
    title: "Extra Notes",
    keys: ["known_faults", "usage_history", "reason_for_selling"]
  }
];

export const BLUETOOTH_SPEAKER_REQUIRED_KEYS = [
  "speaker_type",
  "brand",
  "model",
  "color",
  "connection_type",
  "bluetooth_working",
  "body_condition",
  "buttons_condition",
  "has_scratches",
  "has_cracks",
  "sound_clear",
  "volume_output_good",
  "buttons_working",
  "charging_port_working",
  "battery_condition",
  "battery_backup"
];

export const POWER_BANK_SCHEMA: ListingItemSchema = {
  category: "Electronics & Gadgets",
  subcategory: "Power & Internet",
  itemType: "Power Bank",
  fields: [
    // Device Identity
    {
      key: "brand",
      label: "Brand",
      type: "select",
      required: true,
      options: [
        "Anker",
        "Oraimo",
        "Xiaomi",
        "Baseus",
        "Samsung",
        "Apple",
        "Itel",
        "Tecno",
        "Infinix",
        "Romoss",
        "Other"
      ]
    },
    {
      key: "model",
      label: "Model",
      type: "text",
      required: true,
      placeholder: "e.g. Oraimo Traveler 3, Xiaomi Mi Power Bank 3"
    },
    {
      key: "color",
      label: "Color",
      type: "text",
      required: true,
      placeholder: "e.g. Black, White, Blue"
    },
    {
      key: "capacity",
      label: "Capacity",
      type: "select",
      required: true,
      options: ["5000mAh", "10000mAh", "15000mAh", "20000mAh", "30000mAh", "40000mAh", "Other"]
    },

    // Charging Specs
    {
      key: "input_port_type",
      label: "Input Port Type",
      type: "select",
      required: true,
      options: ["Micro-USB", "USB-C", "Lightning", "Micro-USB + USB-C", "Other"]
    },
    {
      key: "output_port_count",
      label: "Number of Output Ports",
      type: "select",
      required: true,
      options: ["1", "2", "3", "4", "5+"]
    },
    {
      key: "output_port_types",
      label: "Output Port Types",
      type: "multiselect",
      advanced: true,
      options: ["USB-A", "USB-C", "Wireless Charging", "Lightning", "Other"]
    },
    {
      key: "fast_charging_supported",
      label: "Fast Charging Supported",
      type: "boolean",
      advanced: true
    },
    {
      key: "wireless_charging_supported",
      label: "Wireless Charging Supported",
      type: "boolean",
      advanced: true
    },
    {
      key: "display_type",
      label: "Battery Level Display",
      type: "select",
      advanced: true,
      options: ["LED Indicators", "Digital Display", "No Display", "Other"]
    },

    // Compatibility
    {
      key: "compatible_with",
      label: "Compatible With",
      type: "select",
      required: true,
      options: ["Android", "iPhone (iOS)", "Android & iPhone", "Universal", "Not Sure"]
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
      label: "Ports Condition",
      type: "select",
      required: true,
      options: ["Very Good", "Good", "Loose but Working", "Damaged"]
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
    {
      key: "swollen_or_bulging",
      label: "Swollen / Bulging Body",
      type: "boolean",
      required: true
    },

    // Functionality Check
    {
      key: "charges_devices_properly",
      label: "Charges Devices Properly",
      type: "boolean",
      required: true
    },
    {
      key: "holds_charge",
      label: "Holds Charge Well",
      type: "boolean",
      required: true
    },
    {
      key: "input_port_working",
      label: "Input Port Working",
      type: "boolean",
      required: true
    },
    {
      key: "all_output_ports_working",
      label: "All Output Ports Working",
      type: "boolean",
      required: true
    },
    {
      key: "battery_level_display_working",
      label: "Battery Level Display Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "flashlight_available",
      label: "Flashlight Available",
      type: "boolean",
      advanced: true
    },
    {
      key: "flashlight_working",
      label: "Flashlight Working",
      type: "boolean",
      advanced: true
    },

    // Battery Performance
    {
      key: "battery_condition",
      label: "Battery Condition",
      type: "select",
      required: true,
      options: ["Excellent", "Good", "Fair", "Weak", "Needs Replacement"]
    },
    {
      key: "backup_performance",
      label: "Backup Performance",
      type: "select",
      required: true,
      options: [
        "Excellent",
        "Good",
        "Average",
        "Weak",
        "Drains Fast",
        "Not Sure"
      ]
    },
    {
      key: "charging_speed_condition",
      label: "Charging Speed Condition",
      type: "select",
      advanced: true,
      options: ["Fast", "Normal", "Slow", "Inconsistent", "Not Sure"]
    },

    // Safety / Trust
    {
      key: "overheating_issue",
      label: "Any Overheating Issue?",
      type: "boolean",
      advanced: true
    },
    {
      key: "repair_history",
      label: "Has It Been Repaired Before?",
      type: "boolean",
      advanced: true
    },
    {
      key: "proof_of_ownership",
      label: "Proof of Ownership Available",
      type: "boolean",
      advanced: true
    },

    // What's Included
    {
      key: "includes_charging_cable",
      label: "Charging Cable Included",
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
      placeholder: "e.g. USB-C cable, pouch"
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
      placeholder: "e.g. Used for 8 months"
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

export const POWER_BANK_FIELD_GROUPS = [
  {
    title: "Device Identity",
    keys: ["brand", "model", "color", "capacity"]
  },
  {
    title: "Charging Specs",
    keys: [
      "input_port_type",
      "output_port_count",
      "output_port_types",
      "fast_charging_supported",
      "wireless_charging_supported",
      "display_type"
    ]
  },
  {
    title: "Compatibility",
    keys: ["compatible_with"]
  },
  {
    title: "Physical Condition",
    keys: [
      "body_condition",
      "port_condition",
      "has_scratches",
      "has_cracks",
      "swollen_or_bulging"
    ]
  },
  {
    title: "Functionality Check",
    keys: [
      "charges_devices_properly",
      "holds_charge",
      "input_port_working",
      "all_output_ports_working",
      "battery_level_display_working",
      "flashlight_available",
      "flashlight_working"
    ]
  },
  {
    title: "Battery Performance",
    keys: [
      "battery_condition",
      "backup_performance",
      "charging_speed_condition"
    ]
  },
  {
    title: "Safety / Trust",
    keys: ["overheating_issue", "repair_history", "proof_of_ownership"]
  },
  {
    title: "What's Included",
    keys: [
      "includes_charging_cable",
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

export const POWER_BANK_REQUIRED_KEYS = [
  "brand",
  "model",
  "color",
  "capacity",
  "input_port_type",
  "output_port_count",
  "compatible_with",
  "body_condition",
  "port_condition",
  "has_scratches",
  "has_cracks",
  "swollen_or_bulging",
  "charges_devices_properly",
  "holds_charge",
  "input_port_working",
  "all_output_ports_working",
  "battery_condition",
  "backup_performance"
];

export const CHARGER_CHARGING_ADAPTER_SCHEMA: ListingItemSchema = {
  category: "Electronics & Gadgets",
  subcategory: "Power & Internet",
  itemType: "Charger / Charging Adapter",
  fields: [
    // Device Identity
    {
      key: "charger_type",
      label: "Charger Type",
      type: "select",
      required: true,
      options: [
        "Wall Charger",
        "Fast Charger",
        "Wireless Charger",
        "Laptop Charger",
        "Car Charger",
        "Multi-Port Charger",
        "Other"
      ]
    },
    {
      key: "brand",
      label: "Brand",
      type: "select",
      required: true,
      options: [
        "Apple",
        "Samsung",
        "Xiaomi",
        "Oraimo",
        "Anker",
        "Baseus",
        "Huawei",
        "Tecno",
        "Infinix",
        "itel",
        "Dell",
        "HP",
        "Lenovo",
        "Acer",
        "Asus",
        "Other"
      ]
    },
    {
      key: "model",
      label: "Model",
      type: "text",
      required: true,
      placeholder: "e.g. 20W USB-C Adapter, 65W Laptop Charger"
    },
    {
      key: "color",
      label: "Color",
      type: "text",
      advanced: true,
      placeholder: "e.g. White, Black"
    },

    // Charging Specs
    {
      key: "power_output",
      label: "Power Output",
      type: "select",
      required: true,
      options: [
        "5W",
        "10W",
        "12W",
        "15W",
        "18W",
        "20W",
        "25W",
        "30W",
        "45W",
        "65W",
        "87W",
        "96W",
        "100W+",
        "Not Sure"
      ]
    },
    {
      key: "input_type",
      label: "Input Type",
      type: "select",
      advanced: true,
      options: ["2-Pin Plug", "3-Pin Plug", "USB Powered", "Car Socket", "Other"]
    },
    {
      key: "output_port_type",
      label: "Output Port Type",
      type: "multiselect",
      required: true,
      options: ["USB-A", "USB-C", "MagSafe", "DC Pin", "Lightning", "Wireless", "Other"]
    },
    {
      key: "port_count",
      label: "Number of Output Ports",
      type: "select",
      required: true,
      options: ["1", "2", "3", "4", "5+"]
    },
    {
      key: "fast_charging_supported",
      label: "Fast Charging Supported",
      type: "boolean",
      required: true
    },
    {
      key: "pd_support",
      label: "USB Power Delivery (PD) Support",
      type: "boolean",
      advanced: true
    },
    {
      key: "qc_support",
      label: "Quick Charge (QC) Support",
      type: "boolean",
      advanced: true
    },

    // Compatibility
    {
      key: "compatible_with",
      label: "Compatible With",
      type: "select",
      required: true,
      options: [
        "Android",
        "iPhone (iOS)",
        "Laptop",
        "Tablet",
        "Android & iPhone",
        "Universal",
        "Not Sure"
      ]
    },
    {
      key: "connector_tip_type",
      label: "Connector Tip Type",
      type: "select",
      advanced: true,
      options: [
        "USB-C",
        "Lightning",
        "Micro-USB",
        "MagSafe",
        "Barrel / DC Pin",
        "Not Applicable",
        "Other"
      ]
    },

    // Cable / Package
    {
      key: "includes_cable",
      label: "Cable Included",
      type: "boolean",
      required: true
    },
    {
      key: "cable_type",
      label: "Cable Type",
      type: "select",
      advanced: true,
      options: [
        "USB-A to USB-C",
        "USB-C to USB-C",
        "USB-A to Lightning",
        "USB-A to Micro-USB",
        "MagSafe Cable",
        "Not Included",
        "Other"
      ]
    },
    {
      key: "cable_condition",
      label: "Cable Condition",
      type: "select",
      advanced: true,
      options: ["Like New", "Very Good", "Good", "Worn", "Damaged", "Not Included"]
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
      key: "plug_condition",
      label: "Plug Pins Condition",
      type: "select",
      required: true,
      options: ["Very Good", "Good", "Slightly Bent", "Loose", "Damaged"]
    },
    {
      key: "port_condition",
      label: "Port Condition",
      type: "select",
      required: true,
      options: ["Very Good", "Good", "Loose but Working", "Damaged"]
    },
    {
      key: "has_scratches",
      label: "Visible Scratches?",
      type: "boolean",
      advanced: true
    },
    {
      key: "has_cracks",
      label: "Any Cracks?",
      type: "boolean",
      required: true
    },

    // Functionality Check
    {
      key: "charges_properly",
      label: "Charges Properly",
      type: "boolean",
      required: true
    },
    {
      key: "charging_speed_good",
      label: "Charging Speed Good",
      type: "boolean",
      required: true
    },
    {
      key: "all_ports_working",
      label: "All Ports Working",
      type: "boolean",
      required: true
    },
    {
      key: "gets_too_hot",
      label: "Gets Too Hot During Use",
      type: "boolean",
      advanced: true
    },
    {
      key: "loose_connection_issue",
      label: "Loose Connection Issue",
      type: "boolean",
      advanced: true
    },

    // Safety / Trust
    {
      key: "original_product",
      label: "Original Product",
      type: "select",
      required: true,
      options: ["Original", "Compatible / Generic", "Not Sure"]
    },
    {
      key: "repair_history",
      label: "Has It Been Repaired Before?",
      type: "boolean",
      advanced: true
    },
    {
      key: "proof_of_ownership",
      label: "Proof of Ownership Available",
      type: "boolean",
      advanced: true
    },

    // What's Included
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
      key: "adapter_only",
      label: "Adapter Only",
      type: "boolean",
      advanced: true
    },
    {
      key: "accessories_notes",
      label: "Other Included Accessories",
      type: "text",
      advanced: true,
      placeholder: "e.g. Extra cable, converter head"
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
      placeholder: "e.g. Used for 6 months"
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

export const CHARGER_CHARGING_ADAPTER_FIELD_GROUPS = [
  {
    title: "Device Identity",
    keys: ["charger_type", "brand", "model", "color"]
  },
  {
    title: "Charging Specs",
    keys: [
      "power_output",
      "input_type",
      "output_port_type",
      "port_count",
      "fast_charging_supported",
      "pd_support",
      "qc_support"
    ]
  },
  {
    title: "Compatibility",
    keys: ["compatible_with", "connector_tip_type"]
  },
  {
    title: "Cable / Package",
    keys: ["includes_cable", "cable_type", "cable_condition"]
  },
  {
    title: "Physical Condition",
    keys: [
      "body_condition",
      "plug_condition",
      "port_condition",
      "has_scratches",
      "has_cracks"
    ]
  },
  {
    title: "Functionality Check",
    keys: [
      "charges_properly",
      "charging_speed_good",
      "all_ports_working",
      "gets_too_hot",
      "loose_connection_issue"
    ]
  },
  {
    title: "Safety / Trust",
    keys: ["original_product", "repair_history", "proof_of_ownership"]
  },
  {
    title: "What's Included",
    keys: [
      "includes_box",
      "includes_receipt",
      "adapter_only",
      "accessories_notes"
    ]
  },
  {
    title: "Extra Notes",
    keys: ["known_faults", "usage_history", "reason_for_selling"]
  }
];

export const CHARGER_CHARGING_ADAPTER_REQUIRED_KEYS = [
  "charger_type",
  "brand",
  "model",
  "power_output",
  "output_port_type",
  "port_count",
  "fast_charging_supported",
  "compatible_with",
  "includes_cable",
  "body_condition",
  "plug_condition",
  "port_condition",
  "has_cracks",
  "charges_properly",
  "charging_speed_good",
  "all_ports_working",
  "original_product"
];

export const ROUTER_MIFI_MODEM_SCHEMA: ListingItemSchema = {
  category: "Electronics & Gadgets",
  subcategory: "Power & Internet",
  itemType: "Router / MiFi / Modem",
  fields: [
    // Device Identity
    {
      key: "device_type",
      label: "Device Type",
      type: "select",
      required: true,
      options: [
        "Router",
        "MiFi / Mobile Hotspot",
        "Modem",
        "Router + Modem",
        "5G Router",
        "Other"
      ]
    },
    {
      key: "brand",
      label: "Brand",
      type: "select",
      required: true,
      options: [
        "TP-Link",
        "Huawei",
        "ZTE",
        "Netgear",
        "D-Link",
        "Tenda",
        "MikroTik",
        "Airtel",
        "TNM",
        "Nokia",
        "Other"
      ]
    },
    {
      key: "model",
      label: "Model",
      type: "text",
      required: true,
      placeholder: "e.g. Huawei E5576, TP-Link M7200, ZTE MF286"
    },
    {
      key: "color",
      label: "Color",
      type: "text",
      advanced: true,
      placeholder: "e.g. White, Black"
    },

    // Network & Connectivity
    {
      key: "network_support",
      label: "Network Support",
      type: "multiselect",
      required: true,
      options: ["3G", "4G", "5G", "Fiber", "DSL", "Ethernet WAN"]
    },
    {
      key: "sim_support",
      label: "SIM Support",
      type: "select",
      required: true,
      options: ["SIM Required", "No SIM Needed", "Optional SIM", "Not Sure"]
    },
    {
      key: "network_status",
      label: "Network Status",
      type: "select",
      required: true,
      options: [
        "Factory Unlocked",
        "Works on TNM",
        "Works on Airtel",
        "Works on TNM & Airtel",
        "Carrier Locked",
        "Not Sure"
      ]
    },
    {
      key: "wifi_band",
      label: "Wi-Fi Band",
      type: "select",
      advanced: true,
      options: ["2.4GHz", "5GHz", "Dual Band", "Not Sure"]
    },
    {
      key: "max_connected_devices",
      label: "Max Connected Devices",
      type: "select",
      advanced: true,
      options: ["1-5", "6-10", "11-20", "20+", "Not Sure"]
    },
    {
      key: "lan_ports_count",
      label: "LAN Ports",
      type: "select",
      advanced: true,
      options: ["0", "1", "2", "3", "4", "5+"]
    },
    {
      key: "wan_port_available",
      label: "WAN Port Available",
      type: "boolean",
      advanced: true
    },
    {
      key: "usb_port_available",
      label: "USB Port Available",
      type: "boolean",
      advanced: true
    },
    {
      key: "antenna_type",
      label: "Antenna Type",
      type: "select",
      advanced: true,
      options: ["Internal", "External", "Internal + External", "Not Sure"]
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
      label: "Ports Condition",
      type: "select",
      required: true,
      options: ["Very Good", "Good", "Loose but Working", "Damaged"]
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
      key: "powers_on",
      label: "Powers On Properly",
      type: "boolean",
      required: true
    },
    {
      key: "wifi_broadcasting",
      label: "Wi-Fi Broadcasting Properly",
      type: "boolean",
      required: true
    },
    {
      key: "internet_connection_working",
      label: "Internet Connection Working",
      type: "boolean",
      required: true
    },
    {
      key: "sim_slot_working",
      label: "SIM Slot Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "lan_ports_working",
      label: "LAN Ports Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "wan_port_working",
      label: "WAN Port Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "usb_port_working",
      label: "USB Port Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "signal_strength_good",
      label: "Signal Strength Good",
      type: "boolean",
      advanced: true
    },
    {
      key: "buttons_working",
      label: "Buttons Working",
      type: "boolean",
      required: true
    },
    {
      key: "charging_port_working",
      label: "Charging / Power Port Working",
      type: "boolean",
      required: true
    },

    // Battery / Power
    {
      key: "battery_included",
      label: "Battery Included",
      type: "select",
      required: true,
      options: ["Yes", "No", "Not Applicable"]
    },
    {
      key: "battery_condition",
      label: "Battery Condition",
      type: "select",
      advanced: true,
      options: [
        "Excellent",
        "Good",
        "Fair",
        "Weak",
        "Needs Replacement",
        "Not Applicable"
      ]
    },
    {
      key: "battery_backup",
      label: "Battery Backup",
      type: "select",
      advanced: true,
      options: [
        "8+ Hours",
        "4-8 Hours",
        "1-4 Hours",
        "Less Than 1 Hour",
        "Drains Fast",
        "Not Sure",
        "Not Applicable"
      ]
    },
    {
      key: "power_adapter_included",
      label: "Power Adapter Included",
      type: "boolean",
      required: true
    },
    {
      key: "charging_cable_included",
      label: "Charging Cable Included",
      type: "boolean",
      advanced: true
    },

    // Access / Safety
    {
      key: "admin_access_status",
      label: "Admin Access Status",
      type: "select",
      required: true,
      options: [
        "Accessible / Password Known",
        "Reset Ready",
        "Locked / Unknown Password",
        "Not Sure"
      ]
    },
    {
      key: "device_reset_ready",
      label: "Device Ready to Reset / New Setup",
      type: "boolean",
      required: true
    },
    {
      key: "repair_history",
      label: "Has It Been Repaired Before?",
      type: "boolean",
      advanced: true
    },
    {
      key: "proof_of_ownership",
      label: "Proof of Ownership Available",
      type: "boolean",
      advanced: true
    },

    // What's Included
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
      key: "includes_lan_cable",
      label: "LAN Cable Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "includes_external_antennas",
      label: "External Antennas Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "accessories_notes",
      label: "Other Included Accessories",
      type: "text",
      advanced: true,
      placeholder: "e.g. SIM eject tool, spare adapter, mount"
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
      placeholder: "e.g. Used for home internet for 1 year"
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

export const ROUTER_MIFI_MODEM_FIELD_GROUPS = [
  {
    title: "Device Identity",
    keys: ["device_type", "brand", "model", "color"]
  },
  {
    title: "Network & Connectivity",
    keys: [
      "network_support",
      "sim_support",
      "network_status",
      "wifi_band",
      "max_connected_devices",
      "lan_ports_count",
      "wan_port_available",
      "usb_port_available",
      "antenna_type"
    ]
  },
  {
    title: "Physical Condition",
    keys: ["body_condition", "port_condition", "has_scratches", "has_cracks"]
  },
  {
    title: "Functionality Check",
    keys: [
      "powers_on",
      "wifi_broadcasting",
      "internet_connection_working",
      "sim_slot_working",
      "lan_ports_working",
      "wan_port_working",
      "usb_port_working",
      "signal_strength_good",
      "buttons_working",
      "charging_port_working"
    ]
  },
  {
    title: "Battery / Power",
    keys: [
      "battery_included",
      "battery_condition",
      "battery_backup",
      "power_adapter_included",
      "charging_cable_included"
    ]
  },
  {
    title: "Access / Safety",
    keys: [
      "admin_access_status",
      "device_reset_ready",
      "repair_history",
      "proof_of_ownership"
    ]
  },
  {
    title: "What's Included",
    keys: [
      "includes_box",
      "includes_receipt",
      "includes_lan_cable",
      "includes_external_antennas",
      "accessories_notes"
    ]
  },
  {
    title: "Extra Notes",
    keys: ["known_faults", "usage_history", "reason_for_selling"]
  }
];

export const ROUTER_MIFI_MODEM_REQUIRED_KEYS = [
  "device_type",
  "brand",
  "model",
  "network_support",
  "sim_support",
  "network_status",
  "body_condition",
  "port_condition",
  "has_scratches",
  "has_cracks",
  "powers_on",
  "wifi_broadcasting",
  "internet_connection_working",
  "buttons_working",
  "charging_port_working",
  "battery_included",
  "power_adapter_included",
  "admin_access_status",
  "device_reset_ready"
];

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

export const USB_FLASH_DRIVE_FIELD_GROUPS = [
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

export const MEMORY_CARD_FIELD_GROUPS = [
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

export const EXTERNAL_HARD_DRIVE_SSD_FIELD_GROUPS = [
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

export const KEYBOARD_FIELD_GROUPS = [
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

export const MOUSE_FIELD_GROUPS = [
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

