This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

ok đến lúc làm dashboard page rồi, sau khi login điều hướng người dùng đến dashboard, trong dashboard có:
Header:

- Bên trái là button: Khai báo thu chi => Click vào bật modal lên để người dùng khai báo thu chi (sẽ mô tả bên dưới)
- Bên phải là thông tin user, hiển thị là "Xin chào, username" => Click vào thì điều hướng đến trang profile (trang này sẽ để làm sau)
  Body:
- Modal khai báo thu chi: để người dùng nhập liệu: gồm các trường
  - Title (Input): Tên chi tiêu (required)
  - Description (Textarea): Mô tả (optional)
  - Datetime (datepicker có chọn thời gian): Thời gian giao dịch (optional - default: currenttime)
  - CashType (select): Là thu hay chi (Income/Expense) (required - default: chi (Expense))
  - AmountOfMoney (Input): Khoản tiền (VND) (required)
  - Source (Select): Nguồn tiền - chỉ chọn 1 (optional - default: Tiền mặt (tạo nhãn này sẵn trong bảng Source) ) => Trong này ngoài chọn còn cho phép người dùng nhập vào Input
  - Category (Select): Nhãn chính - chỉ chọn 1 (optional - default: Chưa phân loại (tạo nhãn này sẵn trong bảng Category) ) => Trong này ngoài chọn còn cho phép người dùng nhập vào Input để thêm nhãn vào bảng Category
  - Secondary Category (Select): Nhãn phụ - chọn nhiều (optional) => Trong này ngoài chọn còn cho phép người dùng nhập vào Input để thêm nhãn vào bảng SecondaryCategory
  - Submit => buttton để send request và tạo vào bảng CashFlow theo user tương ứng, khi submit cần xác thực đúng user mới cho tạo record nhé

  => đây là thông tin sơ lược tôi muốn làm với form khai báo chi phí, ngoài ra API submit nên nên vào array để sau này có thể mở rộng tính năng import từ file excel

Về các bảng, ngoài bảng user đã tạo, tôi cung cấp thêm

CashFlow:
Id,
User-Id (FK),
Title,
Datetime,
CashType,
AmountOfMoney,
PrimaryCategory-Id (FK),
SecondaryCategory-Id (FK) (Array),
Source-Id (FK),
Description

SecondaryCategory:
Id,
User-Id (FK) (null nếu là nhãn common - Chưa phân loại),
CategoryName

SecondaryCategory:
Id,
User-Id (FK)
CategoryName

Source
Id (PK)
User-Id (FK) (null nếu là source common - Tiền mặt)
SourceName // "Tiền mặt", "Vietcombank", "Momo", "TPBank"...
