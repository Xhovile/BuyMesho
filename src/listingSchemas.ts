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

