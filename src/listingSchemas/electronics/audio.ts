import type { ListingItemSchema, ListingFieldGroup } from "../core.js";

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

export const HEADPHONES_FIELD_GROUPS: ListingFieldGroup[] = [
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

export const EARBUDS_FIELD_GROUPS: ListingFieldGroup[] = [
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

export const BLUETOOTH_SPEAKER_FIELD_GROUPS: ListingFieldGroup[] = [
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
