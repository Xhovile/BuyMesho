import type { ListingItemSchema } from "../core.js";

export const PRINTER_SCHEMA: ListingItemSchema = {
  category: "Electronics & Gadgets",
  subcategory: "Practical Student Tools",
  itemType: "Printer",
  fields: [
    // Device Identity
    {
      key: "printer_type",
      label: "Printer Type",
      type: "select",
      required: true,
      options: [
        "Inkjet Printer",
        "Laser Printer",
        "Ink Tank Printer",
        "All-in-One Printer",
        "Thermal Printer",
        "Photo Printer",
        "Portable Printer",
        "Dot Matrix Printer",
        "Other"
      ]
    },
    {
      key: "function_type",
      label: "Function Type",
      type: "select",
      required: true,
      options: [
        "Print Only",
        "Print + Scan + Copy",
        "Print + Scan + Copy + Fax",
        "Scan Only",
        "Other"
      ]
    },
    {
      key: "brand",
      label: "Brand",
      type: "select",
      required: true,
      options: [
        "HP",
        "Canon",
        "Epson",
        "Brother",
        "Samsung",
        "Pantum",
        "Xerox",
        "Kyocera",
        "Lexmark",
        "Other"
      ]
    },
    {
      key: "model",
      label: "Model",
      type: "text",
      required: true,
      placeholder: "e.g. HP DeskJet 2320, Epson L3250, Brother DCP-T420W"
    },
    {
      key: "color",
      label: "Color",
      type: "text",
      advanced: true,
      placeholder: "e.g. White, Black"
    },
    {
      key: "print_output",
      label: "Print Output",
      type: "select",
      required: true,
      options: ["Black & White", "Color", "Both", "Not Sure"]
    },

    // Connectivity & Compatibility
    {
      key: "connection_types",
      label: "Connection Types",
      type: "multiselect",
      required: true,
      options: ["USB", "Wi-Fi", "Bluetooth", "Ethernet", "Memory Card", "Other"]
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
      key: "mobile_printing_supported",
      label: "Mobile Printing Supported",
      type: "boolean",
      advanced: true
    },
    {
      key: "duplex_printing",
      label: "Duplex Printing",
      type: "boolean",
      advanced: true
    },
    {
      key: "paper_sizes_supported",
      label: "Paper Sizes Supported",
      type: "multiselect",
      advanced: true,
      options: ["A4", "A5", "A3", "Letter", "Legal", "Photo Paper", "Thermal Roll", "Other"]
    },
    {
      key: "print_speed_class",
      label: "Print Speed Class",
      type: "select",
      advanced: true,
      options: ["Basic", "Normal", "Fast", "Very Fast", "Not Sure"]
    },

    // Ink / Toner / Consumables
    {
      key: "consumable_type",
      label: "Consumable Type",
      type: "select",
      required: true,
      options: ["Ink Cartridge", "Ink Tank", "Toner", "Thermal Paper", "Ribbon", "Other"]
    },
    {
      key: "ink_toner_included",
      label: "Ink / Toner Included",
      type: "boolean",
      required: true
    },
    {
      key: "current_supply_status",
      label: "Current Ink / Toner Status",
      type: "select",
      advanced: true,
      options: ["Full", "Partly Used", "Low", "Empty", "Not Sure", "Not Applicable"]
    },
    {
      key: "black_supply_present",
      label: "Black Ink / Toner Present",
      type: "boolean",
      advanced: true
    },
    {
      key: "color_supply_present",
      label: "Color Ink / Toner Present",
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
      key: "paper_tray_condition",
      label: "Paper Tray Condition",
      type: "select",
      required: true,
      options: ["Very Good", "Good", "Loose but Working", "Damaged"]
    },
    {
      key: "scanner_glass_condition",
      label: "Scanner Glass Condition",
      type: "select",
      advanced: true,
      options: ["Clean", "Minor Scratches", "Noticeable Scratches", "Cracked", "Not Applicable"]
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
      key: "prints_properly",
      label: "Prints Properly",
      type: "boolean",
      required: true
    },
    {
      key: "paper_feed_working",
      label: "Paper Feed Working",
      type: "boolean",
      required: true
    },
    {
      key: "buttons_display_working",
      label: "Buttons / Display Working",
      type: "boolean",
      required: true
    },
    {
      key: "usb_connection_working",
      label: "USB Connection Working",
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
      key: "ethernet_port_working",
      label: "Ethernet Port Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "scan_working",
      label: "Scan Function Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "copy_working",
      label: "Copy Function Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "fax_working",
      label: "Fax Function Working",
      type: "boolean",
      advanced: true
    },
    {
      key: "print_quality_condition",
      label: "Print Quality Condition",
      type: "select",
      required: true,
      options: ["Excellent", "Good", "Fair", "Poor", "Needs Service"]
    },
    {
      key: "unusual_noise_or_jamming",
      label: "Unusual Noise / Paper Jamming Issue",
      type: "boolean",
      advanced: true
    },

    // What's Included
    {
      key: "power_cable_included",
      label: "Power Cable Included",
      type: "boolean",
      required: true
    },
    {
      key: "usb_cable_included",
      label: "USB Cable Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "manual_or_setup_guide_included",
      label: "Manual / Setup Guide Included",
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
      placeholder: "e.g. Extra ink, USB cable, paper tray, adapter"
    },

    // Safety / Trust
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
      placeholder: "e.g. Used for assignments and document printing for 1 year"
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

export const PRINTER_FIELD_GROUPS: ListingFieldGroup[] = [
  {
    title: "Device Identity",
    keys: ["printer_type", "function_type", "brand", "model", "color", "print_output"]
  },
  {
    title: "Connectivity & Compatibility",
    keys: [
      "connection_types",
      "compatible_with",
      "mobile_printing_supported",
      "duplex_printing",
      "paper_sizes_supported",
      "print_speed_class"
    ]
  },
  {
    title: "Ink / Toner / Consumables",
    keys: [
      "consumable_type",
      "ink_toner_included",
      "current_supply_status",
      "black_supply_present",
      "color_supply_present"
    ]
  },
  {
    title: "Physical Condition",
    keys: [
      "body_condition",
      "paper_tray_condition",
      "scanner_glass_condition",
      "has_scratches",
      "has_cracks"
    ]
  },
  {
    title: "Functionality Check",
    keys: [
      "powers_on",
      "prints_properly",
      "paper_feed_working",
      "buttons_display_working",
      "usb_connection_working",
      "wifi_working",
      "bluetooth_working",
      "ethernet_port_working",
      "scan_working",
      "copy_working",
      "fax_working",
      "print_quality_condition",
      "unusual_noise_or_jamming"
    ]
  },
  {
    title: "What's Included",
    keys: [
      "power_cable_included",
      "usb_cable_included",
      "manual_or_setup_guide_included",
      "includes_box",
      "includes_receipt",
      "accessories_notes"
    ]
  },
  {
    title: "Safety / Trust",
    keys: ["repair_history", "proof_of_ownership", "warranty_remaining"]
  },
  {
    title: "Extra Notes",
    keys: ["known_faults", "usage_history", "reason_for_selling"]
  }
];

export const PRINTER_REQUIRED_KEYS = [
  "printer_type",
  "function_type",
  "brand",
  "model",
  "print_output",
  "connection_types",
  "compatible_with",
  "consumable_type",
  "ink_toner_included",
  "body_condition",
  "paper_tray_condition",
  "has_scratches",
  "has_cracks",
  "powers_on",
  "prints_properly",
  "paper_feed_working",
  "buttons_display_working",
  "print_quality_condition",
  "power_cable_included"
];

export const CALCULATOR_SCHEMA: ListingItemSchema = {
  category: "Electronics & Gadgets",
  subcategory: "Practical Student Tools",
  itemType: "Calculator",
  fields: [
    // Device Identity
    {
      key: "calculator_type",
      label: "Calculator Type",
      type: "select",
      required: true,
      options: [
        "Basic Calculator",
        "Scientific Calculator",
        "Financial Calculator",
        "Graphing Calculator",
        "Printing Calculator",
        "Desktop Calculator",
        "Other"
      ]
    },
    {
      key: "brand",
      label: "Brand",
      type: "select",
      required: true,
      options: [
        "Casio",
        "Sharp",
        "Canon",
        "Texas Instruments",
        "Citizen",
        "HP",
        "Aurora",
        "Other"
      ]
    },
    {
      key: "model",
      label: "Model",
      type: "text",
      required: true,
      placeholder: "e.g. Casio fx-991ES Plus, Casio fx-82MS"
    },
    {
      key: "color",
      label: "Color",
      type: "text",
      advanced: true,
      placeholder: "e.g. Black, Gray, Blue"
    },

    // Features & Use
    {
      key: "power_type",
      label: "Power Type",
      type: "select",
      required: true,
      options: [
        "Battery Only",
        "Solar Only",
        "Battery + Solar",
        "Rechargeable",
        "Plug Powered",
        "Not Sure"
      ]
    },
    {
      key: "display_lines",
      label: "Display Lines",
      type: "select",
      advanced: true,
      options: ["1-Line", "2-Line", "Multi-Line", "Graph Display", "Not Sure"]
    },
    {
      key: "cover_type",
      label: "Cover Type",
      type: "select",
      advanced: true,
      options: ["Hard Cover", "Slide Cover", "Soft Pouch", "No Cover", "Not Sure"]
    },
    {
      key: "suitable_for",
      label: "Suitable For",
      type: "multiselect",
      required: true,
      options: [
        "Secondary School",
        "College / University",
        "Accounting / Finance",
        "Engineering / Science",
        "Office / Shop Use",
        "General Use"
      ]
    },
    {
      key: "programmable",
      label: "Programmable",
      type: "boolean",
      advanced: true
    },
    {
      key: "exam_allowed_status",
      label: "Exam Allowed Status",
      type: "select",
      advanced: true,
      options: ["Commonly Allowed", "May Be Restricted", "Not Sure"]
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
        "Faded Display",
        "Cracked",
        "Damaged"
      ]
    },
    {
      key: "button_condition",
      label: "Buttons Condition",
      type: "select",
      required: true,
      options: ["Fully Working", "Some Buttons Weak", "Some Buttons Not Working", "Damaged"]
    },
    {
      key: "cover_condition",
      label: "Cover Condition",
      type: "select",
      advanced: true,
      options: ["Like New", "Very Good", "Good", "Worn", "Damaged", "Missing", "Not Applicable"]
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
      key: "display_working",
      label: "Display Working Properly",
      type: "boolean",
      required: true
    },
    {
      key: "all_buttons_working",
      label: "All Buttons Working",
      type: "boolean",
      required: true
    },
    {
      key: "number_keys_working",
      label: "Number Keys Working",
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
      key: "calculation_accuracy_good",
      label: "Calculation Accuracy Good",
      type: "boolean",
      required: true
    },
    {
      key: "solar_panel_working",
      label: "Solar Panel Working",
      type: "boolean",
      advanced: true
    },

    // Battery / Power
    {
      key: "battery_present",
      label: "Battery Present",
      type: "select",
      required: true,
      options: ["Yes", "No", "Not Applicable"]
    },
    {
      key: "battery_condition",
      label: "Battery Condition",
      type: "select",
      advanced: true,
      options: ["Excellent", "Good", "Fair", "Weak", "Needs Replacement", "Not Applicable"]
    },

    // What's Included
    {
      key: "includes_cover",
      label: "Cover Included",
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
      key: "manual_included",
      label: "Manual Included",
      type: "boolean",
      advanced: true
    },
    {
      key: "accessories_notes",
      label: "Other Included Accessories",
      type: "text",
      advanced: true,
      placeholder: "e.g. Protective pouch, spare battery"
    },

    // Safety / Trust
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
      placeholder: "e.g. Used for university classes for 1 semester"
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

export const CALCULATOR_FIELD_GROUPS: ListingFieldGroup[] = [
  {
    title: "Device Identity",
    keys: ["calculator_type", "brand", "model", "color"]
  },
  {
    title: "Features & Use",
    keys: [
      "power_type",
      "display_lines",
      "cover_type",
      "suitable_for",
      "programmable",
      "exam_allowed_status"
    ]
  },
  {
    title: "Physical Condition",
    keys: [
      "body_condition",
      "screen_condition",
      "button_condition",
      "cover_condition",
      "has_scratches",
      "has_cracks"
    ]
  },
  {
    title: "Functionality Check",
    keys: [
      "powers_on",
      "display_working",
      "all_buttons_working",
      "number_keys_working",
      "function_keys_working",
      "calculation_accuracy_good",
      "solar_panel_working"
    ]
  },
  {
    title: "Battery / Power",
    keys: ["battery_present", "battery_condition"]
  },
  {
    title: "What's Included",
    keys: [
      "includes_cover",
      "includes_box",
      "includes_receipt",
      "manual_included",
      "accessories_notes"
    ]
  },
  {
    title: "Safety / Trust",
    keys: ["repair_history", "proof_of_ownership"]
  },
  {
    title: "Extra Notes",
    keys: ["known_faults", "usage_history", "reason_for_selling"]
  }
];

export const CALCULATOR_REQUIRED_KEYS = [
  "calculator_type",
  "brand",
  "model",
  "power_type",
  "suitable_for",
  "body_condition",
  "screen_condition",
  "button_condition",
  "has_scratches",
  "has_cracks",
  "powers_on",
  "display_working",
  "all_buttons_working",
  "number_keys_working",
  "calculation_accuracy_good",
  "battery_present",
  "includes_cover"
];

export interface ListingFieldGroup {
  title: string;
  keys: string[];
}

export interface ListingItemConfig {
  schema: ListingItemSchema;
  fieldGroups: ListingFieldGroup[];
  requiredKeys: string[];
}
