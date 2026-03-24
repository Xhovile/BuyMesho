import type { ListingItemSchema, ListingFieldGroup } from "../core.js";

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

export const LAPTOP_FIELD_GROUPS: ListingFieldGroup[] = [
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

export const DESKTOP_COMPUTER_FIELD_GROUPS: ListingFieldGroup[] = [
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

export const MONITOR_FIELD_GROUPS: ListingFieldGroup[] = [
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
