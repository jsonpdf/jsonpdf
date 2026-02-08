# Pay Stub

An employee pay stub showcasing the **frame plugin** with side-by-side earnings and deductions, each iterating independently over its own data source.

## Features Demonstrated

- **Frame plugin** — two independent band containers (earnings + deductions) rendered side-by-side
- **Frame detail bands** — each frame iterates over its own `dataSource` (`earnings` vs `deductions`)
- **Frame title bands** — section headers rendered before detail rows within each frame
- **Frame summary bands** — totals (Gross Pay / Total Deductions) rendered after detail rows
- **Horizontal container** — positions the two frames side-by-side using `layout: "horizontal"`
- **Shape plugin** — colored title bars (blue for earnings, red for deductions) and column header backgrounds
- **Conditional styles** — overtime earnings highlighted in bold orange via `conditionalStyles`
- **Data binding** — `{{ }}` expressions with `money` filter for currency formatting
- **Line plugin** — horizontal separators between sections

## Why Frames?

A pay stub naturally has **two independent repeating regions** on the same page: earnings (variable count of pay types) and deductions (variable count of tax/benefit items). Without the frame plugin, you can only have one `detail` band per section — so earnings and deductions would stack vertically. Frames enable each region to have its own `detail` band with its own `dataSource`, placed side-by-side.

## Template Structure

| Band                  | Type       | Content                                      |
| --------------------- | ---------- | -------------------------------------------- |
| `header`              | title      | Company name, "PAY STUB" title, pay date     |
| `employee-info`       | body       | Employee name, ID, department, pay period    |
| `earnings-deductions` | body       | Horizontal container with two frame elements |
| `net-pay-band`        | body       | Net pay highlight box, year-to-date totals   |
| `footer`              | pageFooter | Company address, disclaimer                  |

### Earnings Frame Bands

| Band           | Type    | Content                                                                 |
| -------------- | ------- | ----------------------------------------------------------------------- |
| `earn-header`  | title   | Blue title bar + gray column headers (Description, Hours, Rate, Amount) |
| `earn-detail`  | detail  | Each earning row (`dataSource: "earnings"`)                             |
| `earn-summary` | summary | Gross Pay total                                                         |

### Deductions Frame Bands

| Band          | Type    | Content                                                   |
| ------------- | ------- | --------------------------------------------------------- |
| `ded-header`  | title   | Red title bar + gray column headers (Description, Amount) |
| `ded-detail`  | detail  | Each deduction row (`dataSource: "deductions"`)           |
| `ded-summary` | summary | Total Deductions                                          |

## Data Schema

| Field             | Type   | Description                                                 |
| ----------------- | ------ | ----------------------------------------------------------- |
| `companyName`     | string | Company name                                                |
| `companyAddress`  | string | Company address                                             |
| `employeeName`    | string | Employee full name                                          |
| `employeeId`      | string | Employee ID                                                 |
| `department`      | string | Department name                                             |
| `payPeriod`       | string | Pay period dates                                            |
| `payDate`         | string | Payment date                                                |
| `earnings`        | array  | Earning line items (description, hours, rate, amount, type) |
| `deductions`      | array  | Deduction line items (description, amount, type)            |
| `grossPay`        | number | Total gross pay                                             |
| `totalDeductions` | number | Total deductions                                            |
| `netPay`          | number | Net pay (gross minus deductions)                            |
| `ytdGross`        | number | Year-to-date gross                                          |
| `ytdDeductions`   | number | Year-to-date deductions                                     |
| `ytdNet`          | number | Year-to-date net                                            |

## Running

```bash
pnpm render
```

## Files

- `template.json` — Template definition
- `data.json` — Sample payroll data (5 earnings, 6 deductions)
- `output.pdf` — Rendered pay stub (1 page, landscape)
