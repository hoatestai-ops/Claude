# Sổ Calo Việt

Web app ghi calo bữa ăn với món Việt và lập kế hoạch giảm cân theo tuần. Chạy hoàn toàn trên trình duyệt, không cần máy chủ, không cần đăng ký. Dữ liệu chỉ lưu trên máy của bạn (localStorage).

## Tính năng

**Hôm nay (nhật ký ăn uống)**
- Ghi món theo 4 bữa: sáng, trưa, tối, ăn vặt.
- Có sẵn khoảng 75 món Việt (phở, bún chả, cơm tấm, bánh mì, xôi, trà sữa…), tìm được cả khi gõ không dấu ("com tam").
- Chọn số phần (0,5 / 1 / 1,5 / 2 hoặc tự nhập), hoặc tự nhập món mới và lưu vào "Món của tôi".
- Vòng calo còn lại, thanh đạm / tinh bột / chất béo, đếm ly nước, biểu đồ 7 ngày.
- Xoá món có nút Hoàn tác.

**Kế hoạch**
- BMI theo thang châu Á (WHO): từ 23 là thừa cân, từ 25 là béo phì.
- BMR (Mifflin-St Jeor), TDEE theo mức vận động, mục tiêu calo mỗi ngày.
- Không cho mục tiêu xuống dưới 1.200 kcal (nữ) / 1.500 kcal (nam), có cảnh báo khi tốc độ giảm quá nhanh hoặc cân nặng mục tiêu quá thấp.
- Lộ trình từng tuần: cân nặng dự kiến, calo nên ăn (tính lại theo cân nặng mới), ngày dự kiến đạt mục tiêu.
- Gợi ý thực đơn món Việt vừa với lượng calo từng bữa, bấm một lần là ghi vào nhật ký.

**Cân nặng**
- Ghi cân nặng theo ngày, xem tiến độ, biểu đồ thực tế so với kế hoạch và mục tiêu.

**Hồ sơ & dữ liệu**
- Sao chép dữ liệu để sao lưu, dán để khôi phục, xoá toàn bộ.

Lần mở đầu tiên app hiển thị dữ liệu mẫu để bạn thấy cách hoạt động. Bấm "Xoá mẫu, nhập hồ sơ của tôi" để bắt đầu.

## Chạy app

Không cần cài đặt gì. Mở `index.html` bằng trình duyệt, hoặc chạy một máy chủ tĩnh:

```bash
npm start          # python3 -m http.server 8080
# mở http://localhost:8080
```

Có thể đăng lên GitHub Pages: Settings → Pages → chọn nhánh và thư mục gốc.

## Kiểm thử

```bash
npm test           # node --test, không cần cài thư viện
```

## Cấu trúc

```
index.html        Khung trang
css/style.css     Giao diện (sáng / tối)
js/foods.js       Dữ liệu món ăn và thực đơn gợi ý
js/calc.js        Công thức BMI, BMR, TDEE, mục tiêu calo, lộ trình
js/app.js         Giao diện và lưu trữ
tests/            Kiểm thử cho calc.js và dữ liệu món ăn
```

## Lưu ý

Số liệu calo là ước lượng trung bình cho khẩu phần phổ biến; món thực tế có thể chênh lệch tuỳ cách nấu. App không thay thế tư vấn của bác sĩ hay chuyên gia dinh dưỡng, đặc biệt khi bạn có bệnh nền, đang mang thai hoặc cho con bú.
