import type { ListingItemSchema, ListingFieldGroup } from "../core.js";

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

export const POWER_BANK_FIELD_GROUPS: ListingFieldGroup[] = [
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

export const CHARGER_CHARGING_ADAPTER_FIELD_GROUPS: ListingFieldGroup[] = [
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

export const ROUTER_MIFI_MODEM_FIELD_GROUPS: ListingFieldGroup[] = [
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
