// VenopAI Canonical Electronics Catalog & Engineering Bridge
// Generated from VenopAI Engine (venopai.in)
// Powering ENQUEbet Hardware Marketplace & Project Requisition

export interface ProductSpecification {
  key: string;
  value: string;
}

export interface VenopaiProduct {
  id?: string;
  name: string;
  slug: string;
  sku: string;
  category_slug: string;
  price_paise: number;
  compare_price_paise?: number;
  cost_price_paise?: number;
  description: string;
  weight_grams?: number;
  stock_quantity: number;
  reorder_point?: number;
  is_featured?: boolean;
  images: string[];
  specifications: ProductSpecification[];
}

export interface VenopaiCategory {
  name: string;
  slug: string;
  description: string;
  position: number;
  icon?: string;
}

export interface VenopaiService {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  turnaround: string;
  description: string;
  features: string[];
  icon: string;
  url: string;
}

export interface BOMItem {
  product: VenopaiProduct;
  quantity: number;
  notes?: string;
}

export const CANONICAL_CATEGORIES: VenopaiCategory[] = [
  {
    "name": "Microcontrollers & Development",
    "slug": "microcontrollers-development",
    "description": "High-performance ARM Cortex, RISC-V, and Xtensa microcontrollers, development breakout boards, and evaluation modules.",
    "position": 1
  },
  {
    "name": "Sensors & Actuators",
    "slug": "sensors-actuators",
    "description": "Precision environmental, inertial, biometric, optical, and acoustic transducer sensors with digital I2C/SPI interfaces.",
    "position": 2
  },
  {
    "name": "Power & Battery Management",
    "slug": "power-battery-management",
    "description": "High-efficiency step-down buck, boost converters, LDO linear regulators, Li-Ion/LiFePO4 BMS charging and protection modules.",
    "position": 3
  },
  {
    "name": "Connectors & Passives",
    "slug": "connectors-passives",
    "description": "SMD and through-hole passive component reels, ceramic decoupling capacitors, precision resistors, inductors, and industrial terminal blocks.",
    "position": 4
  },
  {
    "name": "Wireless & IoT Modules",
    "slug": "wireless-iot-modules",
    "description": "Long-range LoRa, Bluetooth Low Energy 5.x, Wi-Fi 6, Zigbee, Cellular NB-IoT transceivers and certified RF modules.",
    "position": 5
  },
  {
    "name": "Display & Interface Modules",
    "slug": "display-interface-modules",
    "description": "Crisp OLED, IPS TFT, E-Paper displays, capacitive touch controllers, USB-to-UART bridge ICs, and rotary encoder modules.",
    "position": 6
  },
  {
    "name": "Motor Drivers & Robotics",
    "slug": "motor-drivers-robotics",
    "description": "H-bridge DC motor controllers, silent Trinamic stepper drivers, brushless ESCs, servo multiplexers, and robotic power stages.",
    "position": 7
  },
  {
    "name": "Integrated Circuits & Semis",
    "slug": "integrated-circuits-semis",
    "description": "Operational amplifiers, logic level shifters, optocouplers, MOSFET switches, EEPROM/Flash storage, and discrete power semiconductors.",
    "position": 8
  }
];

export const CANONICAL_SERVICES: VenopaiService[] = [
  {
    "id": "pcb-manufacturing",
    "title": "Rapid PCB Fabrication",
    "slug": "manufacturing",
    "subtitle": "1-6 Layer Prototyping & Stencils",
    "turnaround": "24-48h Rapid Dispatch",
    "description": "High-precision FR-4, Aluminum, and Rogers boards with HASL, Lead-free, or ENIG surface finish. Instant Gerber verification.",
    "features": [
      "1 to 6 Multi-layer PCBs",
      "ENIG / Lead-Free HASL",
      "Laser SMT Stencils",
      "Automated DFM Check"
    ],
    "icon": "Cpu",
    "url": "https://venopai.in/services/manufacturing"
  },
  {
    "id": "3d-prototyping",
    "title": "3D Prototyping & Enclosures",
    "slug": "manufacturing",
    "subtitle": "FDM, SLA Resin & SLS Nylon",
    "turnaround": "12-24h Build Time",
    "description": "Industrial-grade additive manufacturing for custom IoT enclosures, robotics mounts, and mechanical sensor housings.",
    "features": [
      "Tough PLA, PETG, ABS, Resin",
      "0.1mm Layer Precision",
      "Heat-set Brass Thread Inserts",
      "Snap-fit Enclosure Tolerances"
    ],
    "icon": "Box",
    "url": "https://venopai.in/services/manufacturing"
  },
  {
    "id": "hardware-design",
    "title": "Hardware & Schematic Design",
    "slug": "design",
    "subtitle": "KiCad & Altium Engineering",
    "turnaround": "3-5 Day Milestone",
    "description": "Custom circuit schematic capture, component selection, impedance matching, power budget analysis, and multi-layer PCB layout.",
    "features": [
      "Schematic & BOM Optimization",
      "High-Speed Routing & EMI/EMC",
      "Manufacturing Gerber Package",
      "Design for Assembly (DFA)"
    ],
    "icon": "Layers",
    "url": "https://venopai.in/services/design"
  },
  {
    "id": "embedded-software",
    "title": "Embedded Firmware & IoT",
    "slug": "software",
    "subtitle": "FreeRTOS, ESP-IDF & STM32Cube",
    "turnaround": "Milestone-based Sprints",
    "description": "Production-ready firmware for ARM Cortex, ESP32, and Nordic chips. MQTT/TLS cloud telemetry, BLE GATT profiles, and OTA updates.",
    "features": [
      "RTOS Task Scheduling",
      "Ultra Low-Power Sleep Modes",
      "Secure Boot & OTA Telemetry",
      "Driver Development (I2C/SPI)"
    ],
    "icon": "Code2",
    "url": "https://venopai.in/services/software"
  }
];

export const CANONICAL_PRODUCTS: VenopaiProduct[] = [
  {
    "name": "STM32F401 BlackPill Core Board",
    "slug": "stm32f401-blackpill-core-board",
    "sku": "MCU-STM32-F401-BP",
    "category_slug": "microcontrollers-development",
    "price_paise": 42000,
    "compare_price_paise": 49900,
    "cost_price_paise": 28000,
    "description": "ARM Cortex-M4 32-bit RISC core MCU running at 84 MHz with hardware FPU, 256KB Flash, 64KB SRAM, USB Type-C connector and onboard user LED/key.",
    "weight_grams": 18,
    "stock_quantity": 250,
    "reorder_point": 25,
    "is_featured": true,
    "images": [
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "Architecture",
        "value": "ARM Cortex-M4 with FPU"
      },
      {
        "key": "Clock Speed",
        "value": "84 MHz"
      },
      {
        "key": "Flash Memory",
        "value": "256 KB"
      },
      {
        "key": "SRAM",
        "value": "64 KB"
      },
      {
        "key": "Operating Voltage",
        "value": "3.3V DC"
      },
      {
        "key": "Interface",
        "value": "USB-C, SWD, SPI, I2C, USART"
      }
    ]
  },
  {
    "name": "ESP32-S3-WROOM-1 DevBoard",
    "slug": "esp32-s3-wroom-1-devboard",
    "sku": "MCU-ESP32-S3-WROOM",
    "category_slug": "microcontrollers-development",
    "price_paise": 65000,
    "compare_price_paise": 75000,
    "cost_price_paise": 42000,
    "description": "Dual-core Xtensa 32-bit LX7 MCU with vector instructions for AI acceleration, 2.4GHz Wi-Fi + Bluetooth 5 (LE), 8MB Flash, and 2MB PSRAM.",
    "weight_grams": 25,
    "stock_quantity": 300,
    "reorder_point": 30,
    "is_featured": true,
    "images": [
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "Core",
        "value": "Dual-Core Xtensa LX7 @ 240 MHz"
      },
      {
        "key": "Wireless",
        "value": "Wi-Fi 802.11 b/g/n + BLE 5.0"
      },
      {
        "key": "Flash / PSRAM",
        "value": "8MB Flash / 2MB PSRAM"
      },
      {
        "key": "GPIOs",
        "value": "36 Programmable Pins"
      },
      {
        "key": "AI Acceleration",
        "value": "Vector instructions for neural networks"
      }
    ]
  },
  {
    "name": "Raspberry Pi Pico RP2040 Board",
    "slug": "raspberry-pi-pico-rp2040-board",
    "sku": "MCU-RPI-PICO-RP2040",
    "category_slug": "microcontrollers-development",
    "price_paise": 38000,
    "compare_price_paise": 45000,
    "cost_price_paise": 24000,
    "description": "Official Raspberry Pi Pico featuring dual ARM Cortex-M0+ cores at 133 MHz, 2MB onboard QSPI Flash, and 8 Programmable I/O (PIO) state machines.",
    "weight_grams": 15,
    "stock_quantity": 400,
    "reorder_point": 40,
    "is_featured": true,
    "images": [
      "https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "Processor",
        "value": "Dual ARM Cortex-M0+ @ 133 MHz"
      },
      {
        "key": "SRAM",
        "value": "264 KB on-chip"
      },
      {
        "key": "Flash",
        "value": "2MB QSPI Flash"
      },
      {
        "key": "PIO State Machines",
        "value": "8 x Programmable I/O"
      },
      {
        "key": "ADC",
        "value": "12-bit 500ksps ADC"
      }
    ]
  },
  {
    "name": "Raspberry Pi 4 Model B (4GB RAM)",
    "slug": "raspberry-pi-4-model-b-4gb",
    "sku": "SBC-RPI-4B-4GB",
    "category_slug": "microcontrollers-development",
    "price_paise": 549000,
    "compare_price_paise": 599000,
    "cost_price_paise": 460000,
    "description": "Quad-core 64-bit Broadcom BCM2711 ARM Cortex-A72 @ 1.5GHz with 4GB LPDDR4 SDRAM, dual 4K micro-HDMI, Gigabit Ethernet, and USB 3.0 ports.",
    "weight_grams": 46,
    "stock_quantity": 80,
    "reorder_point": 10,
    "is_featured": true,
    "images": [
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "SoC",
        "value": "Broadcom BCM2711 Quad-core A72 @ 1.5GHz"
      },
      {
        "key": "RAM",
        "value": "4GB LPDDR4-3200"
      },
      {
        "key": "Display Output",
        "value": "2 x micro-HDMI (up to 4Kp60)"
      },
      {
        "key": "Connectivity",
        "value": "Gigabit Ethernet, Dual-band Wi-Fi, BLE 5.0"
      }
    ]
  },
  {
    "name": "Arduino Nano Every Board",
    "slug": "arduino-nano-every-board",
    "sku": "MCU-ARD-NANO-EVERY",
    "category_slug": "microcontrollers-development",
    "price_paise": 85000,
    "compare_price_paise": 99000,
    "cost_price_paise": 58000,
    "description": "Upgraded ATmega4809 8-bit microcontroller with 48KB Flash, 6KB RAM, 20 MHz clock speed, and pinout compatible with classic Arduino Nano.",
    "weight_grams": 12,
    "stock_quantity": 150,
    "reorder_point": 15,
    "is_featured": false,
    "images": [
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "Microcontroller",
        "value": "ATmega4809 @ 20 MHz"
      },
      {
        "key": "Operating Voltage",
        "value": "5V DC"
      },
      {
        "key": "Flash / SRAM",
        "value": "48 KB / 6 KB"
      },
      {
        "key": "UART / SPI / I2C",
        "value": "1 / 1 / 1"
      }
    ]
  },
  {
    "name": "BME680 Environmental Sensor Module",
    "slug": "bme680-environmental-sensor-module",
    "sku": "SEN-BME680-4IN1",
    "category_slug": "sensors-actuators",
    "price_paise": 125000,
    "compare_price_paise": 145000,
    "cost_price_paise": 88000,
    "description": "Integrated 4-in-1 digital sensor for gas (VOC), humidity, barometric pressure, and temperature measurement with I2C/SPI interfaces.",
    "weight_grams": 10,
    "stock_quantity": 220,
    "reorder_point": 20,
    "is_featured": true,
    "images": [
      "https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "Parameters",
        "value": "Gas (VOC), Humidity, Barometric Pressure, Temp"
      },
      {
        "key": "Pressure Accuracy",
        "value": "\u00b10.12 hPa (equiv. to \u00b11m altitude)"
      },
      {
        "key": "Interface",
        "value": "I2C (up to 3.4MHz) / SPI"
      },
      {
        "key": "Supply Voltage",
        "value": "1.71V - 3.6V DC"
      }
    ]
  },
  {
    "name": "MPU6050 6-DOF Gyro & Accelerometer",
    "slug": "mpu6050-6-dof-imu-sensor",
    "sku": "SEN-MPU6050-6DOF",
    "category_slug": "sensors-actuators",
    "price_paise": 22000,
    "compare_price_paise": 28000,
    "cost_price_paise": 13000,
    "description": "3-axis gyroscope and 3-axis accelerometer on a single silicon die with Digital Motion Processor (DMP) and I2C output.",
    "weight_grams": 8,
    "stock_quantity": 450,
    "reorder_point": 40,
    "is_featured": true,
    "images": [
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "Axes",
        "value": "6 Degrees of Freedom (3 Accel, 3 Gyro)"
      },
      {
        "key": "Gyro Range",
        "value": "\u00b1250, \u00b1500, \u00b11000, \u00b12000 \u00b0/s"
      },
      {
        "key": "Accel Range",
        "value": "\u00b12g, \u00b14g, \u00b18g, \u00b116g"
      },
      {
        "key": "Engine",
        "value": "On-chip DMP for 6-axis sensor fusion"
      }
    ]
  },
  {
    "name": "VL53L0X Time-of-Flight Distance Sensor",
    "slug": "vl53l0x-tof-distance-sensor",
    "sku": "SEN-VL53L0X-TOF",
    "category_slug": "sensors-actuators",
    "price_paise": 48000,
    "compare_price_paise": 55000,
    "cost_price_paise": 31000,
    "description": "STMicroelectronics laser-ranging module using 940nm VCSEL light pulses to measure absolute distances up to 2 meters independent of target reflectance.",
    "weight_grams": 6,
    "stock_quantity": 180,
    "reorder_point": 20,
    "is_featured": false,
    "images": [
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "Technology",
        "value": "FlightSense Time-of-Flight (ToF)"
      },
      {
        "key": "Range",
        "value": "Up to 2000 mm (2 meters)"
      },
      {
        "key": "Wavelength",
        "value": "940 nm VCSEL (Class 1 safe)"
      },
      {
        "key": "Interface",
        "value": "I2C (Address 0x29)"
      }
    ]
  },
  {
    "name": "INA219 High-Side DC Current Sensor",
    "slug": "ina219-current-sensor-module",
    "sku": "SEN-INA219-CURRENT",
    "category_slug": "sensors-actuators",
    "price_paise": 26000,
    "compare_price_paise": 32000,
    "cost_price_paise": 16000,
    "description": "Zero-drift bidirectional current/power monitor IC with I2C interface, measuring bus voltages from 0 to +26V and currents up to 3.2A.",
    "weight_grams": 7,
    "stock_quantity": 210,
    "reorder_point": 25,
    "is_featured": false,
    "images": [
      "https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "Bus Voltage",
        "value": "0 to 26V DC"
      },
      {
        "key": "Max Current",
        "value": "\u00b13.2A with 0.1 ohm shunt"
      },
      {
        "key": "Resolution",
        "value": "0.8mA"
      },
      {
        "key": "Interface",
        "value": "I2C (Up to 4 addresses)"
      }
    ]
  },
  {
    "name": "HC-SR04 Ultrasonic Distance Sensor",
    "slug": "hc-sr04-ultrasonic-sensor",
    "sku": "SEN-HCSR04-ULTRA",
    "category_slug": "sensors-actuators",
    "price_paise": 11000,
    "compare_price_paise": 15000,
    "cost_price_paise": 6500,
    "description": "Industry standard 40 kHz ultrasonic sonar ranging module measuring non-contact distance from 2cm to 400cm with 3mm precision.",
    "weight_grams": 14,
    "stock_quantity": 500,
    "reorder_point": 50,
    "is_featured": false,
    "images": [
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "Frequency",
        "value": "40 kHz"
      },
      {
        "key": "Ranging Distance",
        "value": "2 cm \u2013 400 cm"
      },
      {
        "key": "Resolution",
        "value": "0.3 cm"
      },
      {
        "key": "Operating Voltage",
        "value": "5V DC"
      }
    ]
  },
  {
    "name": "LM2596S DC-DC Step-Down Buck Converter (3A)",
    "slug": "lm2596s-buck-converter-module-3a",
    "sku": "PWR-LM2596S-BUCK3A",
    "category_slug": "power-battery-management",
    "price_paise": 14000,
    "compare_price_paise": 18000,
    "cost_price_paise": 8500,
    "description": "High-efficiency switching buck regulator module converting 4V-35V input down to 1.25V-30V adjustable output at up to 3A continuous load.",
    "weight_grams": 22,
    "stock_quantity": 350,
    "reorder_point": 35,
    "is_featured": true,
    "images": [
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "Input Voltage",
        "value": "4.5V \u2013 35V DC"
      },
      {
        "key": "Output Voltage",
        "value": "1.25V \u2013 30V DC (Adjustable)"
      },
      {
        "key": "Max Output Current",
        "value": "3A (Heatsink recommended >2A)"
      },
      {
        "key": "Efficiency",
        "value": "Up to 92%"
      },
      {
        "key": "Switching Frequency",
        "value": "150 kHz"
      }
    ]
  },
  {
    "name": "TP4056 1A Li-Ion Battery Charger with USB-C",
    "slug": "tp4056-1a-li-ion-charger-usbc",
    "sku": "PWR-TP4056-USBC-PROT",
    "category_slug": "power-battery-management",
    "price_paise": 6500,
    "compare_price_paise": 9000,
    "cost_price_paise": 3200,
    "description": "Linear constant-current/constant-voltage single cell 3.7V 18650 Li-Ion charger module with DW01A battery overdischarge protection and USB-C port.",
    "weight_grams": 5,
    "stock_quantity": 600,
    "reorder_point": 60,
    "is_featured": true,
    "images": [
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "Charging Current",
        "value": "1A (Configurable via Rprog)"
      },
      {
        "key": "Charge Cutoff Voltage",
        "value": "4.2V \u00b1 1%"
      },
      {
        "key": "Protection",
        "value": "Over-discharge (2.5V) & Overcurrent (3A)"
      },
      {
        "key": "Input Port",
        "value": "USB Type-C"
      }
    ]
  },
  {
    "name": "3S 20A 18650 BMS Protection Board",
    "slug": "3s-20a-18650-bms-protection-board",
    "sku": "PWR-BMS-3S-20A",
    "category_slug": "power-battery-management",
    "price_paise": 24000,
    "compare_price_paise": 31000,
    "cost_price_paise": 14000,
    "description": "3-series 11.1V - 12.6V lithium battery pack BMS module with short-circuit, over-charge, over-discharge, and 20A continuous discharge rating.",
    "weight_grams": 16,
    "stock_quantity": 180,
    "reorder_point": 20,
    "is_featured": false,
    "images": [
      "https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "Configuration",
        "value": "3S (3 x 3.7V Li-Ion in series)"
      },
      {
        "key": "Nominal Voltage",
        "value": "11.1V (12.6V fully charged)"
      },
      {
        "key": "Continuous Current",
        "value": "20A"
      },
      {
        "key": "Peak Pulse Current",
        "value": "40A"
      }
    ]
  },
  {
    "name": "XL6009 High Efficiency Step-Up Boost Module",
    "slug": "xl6009-boost-converter-module",
    "sku": "PWR-XL6009-BOOST",
    "category_slug": "power-battery-management",
    "price_paise": 16500,
    "compare_price_paise": 22000,
    "cost_price_paise": 9500,
    "description": "4A switching current boost converter utilizing 400kHz frequency to deliver 5V-35V output from a 3V-32V input.",
    "weight_grams": 19,
    "stock_quantity": 240,
    "reorder_point": 25,
    "is_featured": false,
    "images": [
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "Input Voltage",
        "value": "3.0V \u2013 32V DC"
      },
      {
        "key": "Output Voltage",
        "value": "5.0V \u2013 35V DC (Adjustable)"
      },
      {
        "key": "Switch Current",
        "value": "4A (Peak)"
      },
      {
        "key": "Switching Frequency",
        "value": "400 kHz"
      }
    ]
  },
  {
    "name": "SMD 0805 Resistor Sample Kit (170 Values)",
    "slug": "smd-0805-resistor-sample-book-kit",
    "sku": "PAS-SMD0805-RES-KIT",
    "category_slug": "connectors-passives",
    "price_paise": 185000,
    "compare_price_paise": 220000,
    "cost_price_paise": 120000,
    "description": "Comprehensive sample folder containing 170 distinct 0805 metric package 1% tolerance resistor values from 0 ohm to 10M ohm, 50 pcs per value.",
    "weight_grams": 350,
    "stock_quantity": 90,
    "reorder_point": 10,
    "is_featured": true,
    "images": [
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "Package Code",
        "value": "0805 (2012 Metric)"
      },
      {
        "key": "Values Count",
        "value": "170 E96 Series Values"
      },
      {
        "key": "Tolerance",
        "value": "\u00b11%"
      },
      {
        "key": "Total Pieces",
        "value": "8500 SMD Resistors"
      }
    ]
  },
  {
    "name": "SMD 0805 Ceramic Capacitor Kit (90 Values)",
    "slug": "smd-0805-capacitor-sample-book-kit",
    "sku": "PAS-SMD0805-CAP-KIT",
    "category_slug": "connectors-passives",
    "price_paise": 240000,
    "compare_price_paise": 280000,
    "cost_price_paise": 160000,
    "description": "Multi-layer ceramic capacitor (MLCC) sample book covering 0.5pF to 10uF across 50V and 16V dielectric ratings, 50 pcs per value.",
    "weight_grams": 320,
    "stock_quantity": 75,
    "reorder_point": 10,
    "is_featured": false,
    "images": [
      "https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "Package",
        "value": "0805 SMD MLCC"
      },
      {
        "key": "Range",
        "value": "0.5 pF \u2013 10 uF"
      },
      {
        "key": "Dielectric",
        "value": "C0G / X7R / X5R"
      },
      {
        "key": "Total Pieces",
        "value": "4500 SMD Capacitors"
      }
    ]
  },
  {
    "name": "USB Type-C 16-Pin Receptacle (Pack of 10)",
    "slug": "usb-type-c-16-pin-receptacle-10pack",
    "sku": "CON-USBC-16P-SMD-10PK",
    "category_slug": "connectors-passives",
    "price_paise": 16000,
    "compare_price_paise": 22000,
    "cost_price_paise": 9500,
    "description": "16-pin mid-mount SMD USB Type-C connector with through-hole mechanical retention pegs and gold-plated contacts.",
    "weight_grams": 25,
    "stock_quantity": 400,
    "reorder_point": 50,
    "is_featured": false,
    "images": [
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "Pin Count",
        "value": "16 Pins (Power & USB 2.0 D+/D-)"
      },
      {
        "key": "Current Rating",
        "value": "3A VBUS"
      },
      {
        "key": "Mounting",
        "value": "Hybrid SMD + Through-hole shield legs"
      },
      {
        "key": "Durability",
        "value": "10,000 Mating Cycles"
      }
    ]
  },
  {
    "name": "KF301-2P Screw Terminal Block (Pack of 10)",
    "slug": "kf301-2p-screw-terminal-block-10pack",
    "sku": "CON-KF301-2P-10PK",
    "category_slug": "connectors-passives",
    "price_paise": 12000,
    "compare_price_paise": 16000,
    "cost_price_paise": 6500,
    "description": "5.0mm pitch 2-position blue PCB interlocking screw terminal blocks rated for 300V 16A wiring connections.",
    "weight_grams": 55,
    "stock_quantity": 500,
    "reorder_point": 50,
    "is_featured": false,
    "images": [
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "Pitch",
        "value": "5.0 mm (0.197 inch)"
      },
      {
        "key": "Rated Voltage / Current",
        "value": "300V / 16A"
      },
      {
        "key": "Wire Range",
        "value": "22 \u2013 14 AWG"
      },
      {
        "key": "Quantity",
        "value": "10 pcs / pack"
      }
    ]
  },
  {
    "name": "LoRa SX1278 433MHz Transceiver Module",
    "slug": "lora-sx1278-433mhz-transceiver-module",
    "sku": "WRL-LORA-SX1278-433",
    "category_slug": "wireless-iot-modules",
    "price_paise": 58000,
    "compare_price_paise": 69000,
    "cost_price_paise": 38000,
    "description": "Semtech SX1278 long range spread spectrum wireless transceiver module operating at 433 MHz with +20 dBm output power and -148 dBm sensitivity.",
    "weight_grams": 14,
    "stock_quantity": 200,
    "reorder_point": 20,
    "is_featured": true,
    "images": [
      "https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "Frequency Band",
        "value": "433 MHz (ISM Band)"
      },
      {
        "key": "Modulation",
        "value": "LoRa, FSK, GFSK, OOK"
      },
      {
        "key": "Output Power",
        "value": "+20 dBm (100 mW)"
      },
      {
        "key": "Sensitivity",
        "value": "-148 dBm"
      },
      {
        "key": "Range",
        "value": "Up to 5 km line-of-sight"
      }
    ]
  },
  {
    "name": "NRF24L01+ 2.4GHz PA+LNA with Antenna",
    "slug": "nrf24l01-pa-lna-24ghz-transceiver",
    "sku": "WRL-NRF24-PALNA-24",
    "category_slug": "wireless-iot-modules",
    "price_paise": 28000,
    "compare_price_paise": 35000,
    "cost_price_paise": 16000,
    "description": "Ultra-low power 2.4GHz ISM RF transceiver with power amplifier and low-noise amplifier delivering up to 1100 meters range with external SMA antenna.",
    "weight_grams": 22,
    "stock_quantity": 320,
    "reorder_point": 30,
    "is_featured": false,
    "images": [
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "Frequency",
        "value": "2.400 \u2013 2.4835 GHz"
      },
      {
        "key": "Max Data Rate",
        "value": "2 Mbps (GFSK)"
      },
      {
        "key": "Transmission Range",
        "value": "Up to 1100 meters"
      },
      {
        "key": "Antenna",
        "value": "External SMA Dipole included"
      }
    ]
  },
  {
    "name": "SIM800L GPRS/GSM Quad-Band Cellular Module",
    "slug": "sim800l-gprs-gsm-cellular-module",
    "sku": "WRL-SIM800L-GPRS-GSM",
    "category_slug": "wireless-iot-modules",
    "price_paise": 48000,
    "compare_price_paise": 59000,
    "cost_price_paise": 31000,
    "description": "Miniature quad-band GSM/GPRS module supporting 850/900/1800/1900 MHz for SMS, voice calls, and GPRS TCP/IP telemetry in remote IoT installations.",
    "weight_grams": 16,
    "stock_quantity": 140,
    "reorder_point": 15,
    "is_featured": false,
    "images": [
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "Frequencies",
        "value": "850/900/1800/1900 MHz"
      },
      {
        "key": "Data Transmission",
        "value": "GPRS Class 12 (max 85.6 kbps)"
      },
      {
        "key": "Operating Voltage",
        "value": "3.7V \u2013 4.2V (High peak current)"
      },
      {
        "key": "SIM Card",
        "value": "Micro-SIM slot onboard"
      }
    ]
  },
  {
    "name": "NEO-6M GPS Receiver with Active Ceramic Antenna",
    "slug": "neo-6m-gps-receiver-module",
    "sku": "WRL-NEO6M-GPS-MOD",
    "category_slug": "wireless-iot-modules",
    "price_paise": 49000,
    "compare_price_paise": 59000,
    "cost_price_paise": 32000,
    "description": "High-sensitivity 50-channel GPS engine with onboard EEPROM for configuration persistence, backup battery, and external ceramic patch antenna.",
    "weight_grams": 24,
    "stock_quantity": 180,
    "reorder_point": 20,
    "is_featured": false,
    "images": [
      "https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "Receiver Type",
        "value": "50-channel GPS L1 frequency (1575.42MHz)"
      },
      {
        "key": "Position Accuracy",
        "value": "2.5 m CEP"
      },
      {
        "key": "Update Rate",
        "value": "Up to 5 Hz"
      },
      {
        "key": "Interface",
        "value": "UART 9600 baud default"
      }
    ]
  },
  {
    "name": "0.96 inch I2C OLED Display (128x64 Blue/Yellow)",
    "slug": "096-inch-i2c-oled-display-128x64",
    "sku": "DSP-OLED-096-I2C-BY",
    "category_slug": "display-interface-modules",
    "price_paise": 24000,
    "compare_price_paise": 29000,
    "cost_price_paise": 14000,
    "description": "High-contrast self-luminous organic LED display module powered by SSD1306 controller with ultra-wide 160-degree viewing angle and 4-pin I2C bus.",
    "weight_grams": 9,
    "stock_quantity": 400,
    "reorder_point": 40,
    "is_featured": true,
    "images": [
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "Display Size",
        "value": "0.96 inch diagonal"
      },
      {
        "key": "Resolution",
        "value": "128 x 64 pixels"
      },
      {
        "key": "Driver IC",
        "value": "SSD1306"
      },
      {
        "key": "Interface",
        "value": "I2C (Address 0x3C / 0x3D)"
      },
      {
        "key": "Operating Voltage",
        "value": "3.3V \u2013 5.0V DC"
      }
    ]
  },
  {
    "name": "1.8 inch SPI TFT LCD Color Display (128x160)",
    "slug": "18-inch-spi-tft-lcd-st7735",
    "sku": "DSP-TFT-18-SPI-ST7735",
    "category_slug": "display-interface-modules",
    "price_paise": 42000,
    "compare_price_paise": 52000,
    "cost_price_paise": 26000,
    "description": "Vibrant 65K color full-color LCD display driven by ST7735S controller featuring an integrated micro-SD card reader slot on the rear PCB.",
    "weight_grams": 20,
    "stock_quantity": 170,
    "reorder_point": 20,
    "is_featured": false,
    "images": [
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "Screen Size",
        "value": "1.8 inch TFT"
      },
      {
        "key": "Resolution",
        "value": "128 x 160 RGB"
      },
      {
        "key": "Driver Controller",
        "value": "ST7735S"
      },
      {
        "key": "Storage Slot",
        "value": "Micro-SD Card SPI onboard"
      }
    ]
  },
  {
    "name": "CP2102 USB to UART Bridge Module",
    "slug": "cp2102-usb-to-uart-bridge-module",
    "sku": "INT-CP2102-USB-UART",
    "category_slug": "display-interface-modules",
    "price_paise": 19000,
    "compare_price_paise": 24000,
    "cost_price_paise": 11000,
    "description": "Silicon Labs CP2102 high-speed USB 2.0 to TTL serial breakout board featuring DTR pin for automated ESP/Arduino flashing and dual 3.3V/5V outputs.",
    "weight_grams": 10,
    "stock_quantity": 300,
    "reorder_point": 30,
    "is_featured": false,
    "images": [
      "https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "Chipset",
        "value": "Silicon Labs CP2102"
      },
      {
        "key": "Baud Rate Range",
        "value": "300 bps to 1.5 Mbps"
      },
      {
        "key": "Output Pins",
        "value": "5V, 3.3V, TXD, RXD, GND, DTR"
      },
      {
        "key": "Auto-Reset",
        "value": "DTR connected for automatic microcontroller flashing"
      }
    ]
  },
  {
    "name": "KY-040 Rotary Encoder Module with Pushbutton",
    "slug": "ky-040-rotary-encoder-module",
    "sku": "INT-KY040-ROT-ENC",
    "category_slug": "display-interface-modules",
    "price_paise": 9500,
    "compare_price_paise": 14000,
    "cost_price_paise": 4800,
    "description": "Incremental 360-degree rotational input encoder with 20 pulses per revolution and integrated momentary tactile push button switch.",
    "weight_grams": 12,
    "stock_quantity": 280,
    "reorder_point": 30,
    "is_featured": false,
    "images": [
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "Pulses per Rev",
        "value": "20 pulses / 360\u00b0"
      },
      {
        "key": "Switch Type",
        "value": "Integral momentary contact push button"
      },
      {
        "key": "Operating Voltage",
        "value": "5V DC"
      }
    ]
  },
  {
    "name": "L298N Dual H-Bridge Motor Driver Module",
    "slug": "l298n-dual-h-bridge-motor-driver",
    "sku": "MOT-L298N-DUAL-HBR",
    "category_slug": "motor-drivers-robotics",
    "price_paise": 19500,
    "compare_price_paise": 25000,
    "cost_price_paise": 11500,
    "description": "Robust dual H-bridge motor driver board capable of driving two DC motors independently or one 4-wire two-phase bipolar stepper motor up to 2A per channel.",
    "weight_grams": 33,
    "stock_quantity": 380,
    "reorder_point": 35,
    "is_featured": true,
    "images": [
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "Driver Chip",
        "value": "STMicroelectronics L298N"
      },
      {
        "key": "Motor Supply Voltage",
        "value": "5V \u2013 35V DC"
      },
      {
        "key": "Peak Output Current",
        "value": "2A per bridge"
      },
      {
        "key": "Onboard 5V Regulator",
        "value": "78M05 linear regulator onboard"
      }
    ]
  },
  {
    "name": "TMC2209 Silent Stepper Driver Module",
    "slug": "tmc2209-silent-stepper-driver-module",
    "sku": "MOT-TMC2209-SILENT-STP",
    "category_slug": "motor-drivers-robotics",
    "price_paise": 38000,
    "compare_price_paise": 48000,
    "cost_price_paise": 24000,
    "description": "Trinamic ultra-silent stepper motor driver featuring StealthChop2, SpreadCycle, StallGuard4 sensorless homing, and UART configuration interface.",
    "weight_grams": 10,
    "stock_quantity": 250,
    "reorder_point": 25,
    "is_featured": true,
    "images": [
      "https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "Technologies",
        "value": "StealthChop2, SpreadCycle, StallGuard4"
      },
      {
        "key": "Max RMS Current",
        "value": "2.0A (2.8A Peak)"
      },
      {
        "key": "Microstepping",
        "value": "Up to 1/256 interpolation"
      },
      {
        "key": "Motor Voltage",
        "value": "4.75V \u2013 28V DC"
      }
    ]
  },
  {
    "name": "PCA9685 16-Channel 12-Bit PWM Servo Driver",
    "slug": "pca9685-16-channel-pwm-servo-driver",
    "sku": "MOT-PCA9685-16CH-PWM",
    "category_slug": "motor-drivers-robotics",
    "price_paise": 29000,
    "compare_price_paise": 36000,
    "cost_price_paise": 17000,
    "description": "I2C-controlled 16-channel PWM driver module with internal clock generator, ideal for driving 16 RC servos or RGB LEDs simultaneously.",
    "weight_grams": 16,
    "stock_quantity": 190,
    "reorder_point": 20,
    "is_featured": false,
    "images": [
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "Channels",
        "value": "16 PWM Output Channels"
      },
      {
        "key": "Resolution",
        "value": "12-bit (4096 steps)"
      },
      {
        "key": "PWM Frequency",
        "value": "24 Hz \u2013 1526 Hz (Configurable)"
      },
      {
        "key": "Bus Control",
        "value": "I2C up to 62 chained modules"
      }
    ]
  },
  {
    "name": "DRV8825 Stepper Motor Driver Carrier",
    "slug": "drv8825-stepper-motor-driver-carrier",
    "sku": "MOT-DRV8825-STEPPER-MOD",
    "category_slug": "motor-drivers-robotics",
    "price_paise": 18000,
    "compare_price_paise": 24000,
    "cost_price_paise": 10500,
    "description": "TI DRV8825 microstepping bipolar stepper driver board with adjustable current limiting, overcurrent protection, and 6 microstep resolutions down to 1/32-step.",
    "weight_grams": 8,
    "stock_quantity": 300,
    "reorder_point": 30,
    "is_featured": false,
    "images": [
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "Operating Voltage",
        "value": "8.2V \u2013 45V DC"
      },
      {
        "key": "Continuous Current",
        "value": "1.5A per phase (2.2A with cooling)"
      },
      {
        "key": "Step Modes",
        "value": "Full, 1/2, 1/4, 1/8, 1/16, 1/32 step"
      }
    ]
  },
  {
    "name": "4-Channel I2C Bi-Directional Logic Level Shifter",
    "slug": "4-channel-i2c-logic-level-shifter-3v-5v",
    "sku": "SEM-LEVEL-SHIFT-4CH-BIDI",
    "category_slug": "integrated-circuits-semis",
    "price_paise": 7500,
    "compare_price_paise": 11000,
    "cost_price_paise": 3500,
    "description": "MOSFET-based bidirectional voltage level converter board safely stepping 5V signals down to 3.3V and 3.3V signals up to 5V across 4 lines.",
    "weight_grams": 4,
    "stock_quantity": 500,
    "reorder_point": 50,
    "is_featured": true,
    "images": [
      "https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "Channels",
        "value": "4 Bidirectional Channels"
      },
      {
        "key": "High Voltage Side (HV)",
        "value": "Up to 5V DC"
      },
      {
        "key": "Low Voltage Side (LV)",
        "value": "Down to 1.8V / 3.3V DC"
      },
      {
        "key": "Compatibility",
        "value": "I2C, SPI, UART, 1-Wire"
      }
    ]
  },
  {
    "name": "5V 2-Channel Relay Module with Optocoupler Isolation",
    "slug": "5v-2-channel-relay-module-optocoupler",
    "sku": "SEM-RELAY-2CH-5V-OPTO",
    "category_slug": "integrated-circuits-semis",
    "price_paise": 14500,
    "compare_price_paise": 19000,
    "cost_price_paise": 8200,
    "description": "Opto-isolated 2-channel electromagnetic relay expansion board capable of switching mains AC loads up to 250V 10A from a 5V microcontroller logic signal.",
    "weight_grams": 32,
    "stock_quantity": 310,
    "reorder_point": 30,
    "is_featured": false,
    "images": [
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "Relay Contact Rating",
        "value": "AC 250V/10A, DC 30V/10A"
      },
      {
        "key": "Trigger Voltage",
        "value": "5V DC"
      },
      {
        "key": "Trigger Level",
        "value": "Selectable High or Low level trigger"
      },
      {
        "key": "Isolation",
        "value": "Photocoupler isolation to protect MCU"
      }
    ]
  },
  {
    "name": "IRFZ44N N-Channel Power MOSFET (Pack of 5)",
    "slug": "irfz44n-n-channel-power-mosfet-5pack",
    "sku": "SEM-IRFZ44N-MOSFET-5PK",
    "category_slug": "integrated-circuits-semis",
    "price_paise": 17500,
    "compare_price_paise": 23000,
    "cost_price_paise": 9500,
    "description": "55V 49A advanced HEXFET N-channel power MOSFET in TO-220AB package featuring ultra-low 17.5 mOhm on-resistance for high-speed power switching.",
    "weight_grams": 18,
    "stock_quantity": 420,
    "reorder_point": 40,
    "is_featured": false,
    "images": [
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "Drain-Source Voltage (Vds)",
        "value": "55V"
      },
      {
        "key": "Continuous Drain Current (Id)",
        "value": "49A @ 25\u00b0C"
      },
      {
        "key": "Rds(on)",
        "value": "17.5 mOhm"
      },
      {
        "key": "Package",
        "value": "TO-220AB"
      }
    ]
  },
  {
    "name": "PC817 4-Channel Optocoupler Isolation Board",
    "slug": "pc817-4-channel-optocoupler-isolation-board",
    "sku": "SEM-PC817-OPTO-4CH",
    "category_slug": "integrated-circuits-semis",
    "price_paise": 11000,
    "compare_price_paise": 15000,
    "cost_price_paise": 5500,
    "description": "4-channel independent phototransistor optical isolator module for high-voltage DC signal conversion and noisy industrial noise suppression.",
    "weight_grams": 15,
    "stock_quantity": 260,
    "reorder_point": 25,
    "is_featured": false,
    "images": [
      "https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=600&q=80"
    ],
    "specifications": [
      {
        "key": "Isolation Voltage",
        "value": "5000 Vrms"
      },
      {
        "key": "Input Driving Voltage",
        "value": "3.6V \u2013 24V DC"
      },
      {
        "key": "Output Voltage Range",
        "value": "3.6V \u2013 30V DC"
      },
      {
        "key": "Channels",
        "value": "4 Galvanically Isolated Channels"
      }
    ]
  }
];

export function formatPriceINR(paise: number): string {
  const rupees = Math.round(paise / 100);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

export function getVenopaiProductUrl(slug: string, ref: string = 'enquebet'): string {
  const base = process.env.NEXT_PUBLIC_VENOPAI_WEB_URL || 'https://venopai.in';
  return `${base}/products/${slug}?ref=${encodeURIComponent(ref)}&src=enquebet_shop`;
}

export function getVenopaiServiceUrl(slug: string, ref: string = 'enquebet'): string {
  const base = process.env.NEXT_PUBLIC_VENOPAI_WEB_URL || 'https://venopai.in';
  return `${base}/services/${slug}?ref=${encodeURIComponent(ref)}&src=enquebet_shop`;
}

export async function fetchVenopaiCatalog(): Promise<{
  categories: VenopaiCategory[];
  products: VenopaiProduct[];
  isLive: boolean;
}> {
  try {
    const res = await fetch('/api/venopai/catalog', {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.products) && data.products.length > 0) {
        return {
          categories: data.categories || CANONICAL_CATEGORIES,
          products: data.products,
          isLive: Boolean(data.isLive),
        };
      }
    }
  } catch {
    // Graceful fallback to canonical catalog
  }

  return {
    categories: CANONICAL_CATEGORIES,
    products: CANONICAL_PRODUCTS,
    isLive: false,
  };
}
