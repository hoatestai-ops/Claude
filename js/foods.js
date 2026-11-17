/*
 * Cơ sở dữ liệu món ăn Việt Nam thường gặp.
 * Giá trị năng lượng là ước lượng trung bình cho 1 khẩu phần (serving),
 * tổng hợp từ bảng thành phần dinh dưỡng thực phẩm Việt Nam và các nguồn phổ biến.
 * p = đạm (g), c = tinh bột (g), f = chất béo (g).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FoodDB = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const FOOD_CATEGORIES = [
    { id: 'mon-nuoc', label: 'Phở · Bún · Mì' },
    { id: 'com-xoi', label: 'Cơm · Xôi · Bánh' },
    { id: 'tinh-bot', label: 'Tinh bột' },
    { id: 'dam', label: 'Thịt · Cá · Trứng' },
    { id: 'rau', label: 'Rau & canh' },
    { id: 'trai-cay', label: 'Trái cây' },
    { id: 'do-uong', label: 'Đồ uống' },
    { id: 'an-vat', label: 'Ăn vặt' },
  ];

  // [id, tên, nhóm, khẩu phần, kcal, đạm, tinh bột, béo]
  const RAW = [
    ['pho-bo', 'Phở bò tái', 'mon-nuoc', '1 tô (~500 g)', 430, 24, 56, 12],
    ['pho-ga', 'Phở gà', 'mon-nuoc', '1 tô (~500 g)', 400, 26, 55, 8],
    ['bun-bo-hue', 'Bún bò Huế', 'mon-nuoc', '1 tô', 480, 26, 58, 15],
    ['bun-cha', 'Bún chả', 'mon-nuoc', '1 suất', 570, 28, 62, 23],
    ['bun-rieu', 'Bún riêu cua', 'mon-nuoc', '1 tô', 410, 20, 55, 12],
    ['bun-thit-nuong', 'Bún thịt nướng', 'mon-nuoc', '1 tô', 450, 22, 60, 13],
    ['bun-dau', 'Bún đậu mắm tôm', 'mon-nuoc', '1 suất', 680, 30, 70, 31],
    ['hu-tieu', 'Hủ tiếu Nam Vang', 'mon-nuoc', '1 tô', 420, 22, 58, 11],
    ['mi-quang', 'Mì Quảng', 'mon-nuoc', '1 tô', 540, 28, 62, 20],
    ['mi-goi', 'Mì gói', 'mon-nuoc', '1 gói (75 g)', 350, 7, 46, 15],

    ['com-tam', 'Cơm tấm sườn bì chả', 'com-xoi', '1 đĩa', 650, 32, 75, 24],
    ['com-ga', 'Cơm gà', 'com-xoi', '1 đĩa', 600, 34, 72, 19],
    ['com-rang', 'Cơm rang dưa bò', 'com-xoi', '1 đĩa', 700, 25, 85, 29],
    ['banh-mi-thit', 'Bánh mì thịt', 'com-xoi', '1 ổ', 420, 17, 50, 17],
    ['banh-mi-trung', 'Bánh mì trứng ốp la', 'com-xoi', '1 ổ', 370, 14, 45, 15],
    ['xoi-xeo', 'Xôi xéo', 'com-xoi', '1 gói (~200 g)', 480, 11, 78, 14],
    ['xoi-ga', 'Xôi gà', 'com-xoi', '1 gói', 520, 22, 75, 15],
    ['banh-cuon', 'Bánh cuốn', 'com-xoi', '1 đĩa', 380, 14, 60, 9],
    ['banh-xeo', 'Bánh xèo', 'com-xoi', '1 cái', 310, 10, 28, 18],
    ['goi-cuon', 'Gỏi cuốn tôm thịt', 'com-xoi', '1 cuốn', 70, 5, 10, 1],
    ['nem-ran', 'Nem rán (chả giò)', 'com-xoi', '1 cái', 110, 4, 8, 7],
    ['chao-ga', 'Cháo gà', 'com-xoi', '1 bát', 280, 16, 38, 7],
    ['banh-chung', 'Bánh chưng', 'com-xoi', '1/4 cái (~150 g)', 280, 8, 45, 8],
    ['banh-bao', 'Bánh bao nhân thịt', 'com-xoi', '1 cái', 330, 12, 45, 11],

    ['com-trang', 'Cơm trắng', 'tinh-bot', '1 bát (~150 g)', 200, 4, 45, 0.4],
    ['com-gao-lut', 'Cơm gạo lứt', 'tinh-bot', '1 bát (~150 g)', 180, 4, 38, 1.4],
    ['bun-tuoi', 'Bún tươi', 'tinh-bot', '100 g', 110, 1.7, 25, 0.2],
    ['khoai-lang', 'Khoai lang luộc', 'tinh-bot', '1 củ (~150 g)', 130, 2.4, 30, 0.2],
    ['ngo-luoc', 'Ngô luộc', 'tinh-bot', '1 bắp', 130, 4, 26, 1.5],
    ['banh-mi-khong', 'Bánh mì không', 'tinh-bot', '1 ổ', 250, 8, 50, 2],
    ['yen-mach', 'Yến mạch', 'tinh-bot', '40 g khô', 150, 5, 27, 2.7],

    ['uc-ga', 'Ức gà luộc', 'dam', '100 g', 165, 31, 0, 3.6],
    ['ga-ran', 'Gà rán', 'dam', '1 miếng đùi', 320, 22, 11, 21],
    ['thit-bo-nac', 'Thịt bò nạc', 'dam', '100 g', 150, 26, 0, 5],
    ['thit-lon-nac', 'Thịt lợn nạc luộc', 'dam', '100 g', 140, 21, 0, 6],
    ['thit-ba-chi', 'Thịt ba chỉ', 'dam', '100 g', 500, 9, 0, 52],
    ['thit-kho', 'Thịt kho tàu (kèm trứng)', 'dam', '1 phần (~150 g)', 400, 22, 8, 31],
    ['ca-kho', 'Cá kho', 'dam', '1 khúc (~100 g)', 180, 20, 4, 9],
    ['ca-ro-phi', 'Cá rô phi hấp', 'dam', '100 g', 100, 20, 0, 2],
    ['ca-hoi', 'Cá hồi', 'dam', '100 g', 208, 20, 0, 13.4],
    ['tom-luoc', 'Tôm luộc', 'dam', '100 g', 100, 22, 0, 1],
    ['trung-luoc', 'Trứng gà luộc', 'dam', '1 quả', 75, 6.3, 0.6, 5],
    ['trung-chien', 'Trứng chiên', 'dam', '1 quả', 95, 6.3, 0.6, 7.5],
    ['dau-phu', 'Đậu phụ', 'dam', '100 g', 95, 10, 2, 5],
    ['dau-phu-ran', 'Đậu phụ rán', 'dam', '100 g', 275, 17, 9, 20],

    ['rau-muong-xao', 'Rau muống xào tỏi', 'rau', '1 đĩa (~200 g)', 150, 6, 8, 10],
    ['rau-luoc', 'Rau luộc', 'rau', '1 đĩa', 40, 3, 7, 0.3],
    ['canh-chua', 'Canh chua cá', 'rau', '1 bát', 120, 12, 10, 3.5],
    ['canh-rau-ngot', 'Canh rau ngót thịt băm', 'rau', '1 bát', 80, 7, 4, 4],
    ['salad', 'Salad trộn dầu giấm', 'rau', '1 đĩa', 120, 2, 8, 9],
    ['dua-chuot', 'Dưa chuột', 'rau', '1 quả', 20, 1, 4, 0.1],

    ['chuoi', 'Chuối', 'trai-cay', '1 quả', 105, 1.3, 27, 0.4],
    ['tao', 'Táo', 'trai-cay', '1 quả', 95, 0.5, 25, 0.3],
    ['cam', 'Cam', 'trai-cay', '1 quả', 62, 1.2, 15, 0.2],
    ['xoai', 'Xoài chín', 'trai-cay', '1 quả (~200 g ăn được)', 130, 1.6, 30, 0.8],
    ['dua-hau', 'Dưa hấu', 'trai-cay', '1 miếng (~300 g)', 90, 1.8, 23, 0.5],
    ['oi', 'Ổi', 'trai-cay', '1 quả', 70, 2.6, 14, 1],
    ['bo', 'Bơ', 'trai-cay', '1/2 quả', 160, 2, 9, 15],

    ['cafe-den', 'Cà phê đen không đường', 'do-uong', '1 ly', 5, 0.3, 0, 0],
    ['cafe-sua', 'Cà phê sữa đá', 'do-uong', '1 ly', 160, 3, 26, 4.5],
    ['bac-xiu', 'Bạc xỉu', 'do-uong', '1 ly', 220, 5, 34, 7],
    ['tra-sua', 'Trà sữa trân châu', 'do-uong', '1 ly 500 ml', 450, 4, 80, 13],
    ['nuoc-mia', 'Nước mía', 'do-uong', '1 ly', 180, 0, 45, 0],
    ['sinh-to-bo', 'Sinh tố bơ', 'do-uong', '1 ly', 350, 5, 45, 17],
    ['sua-tuoi', 'Sữa tươi không đường', 'do-uong', '1 hộp 180 ml', 115, 5.6, 8.6, 6.5],
    ['bia', 'Bia', 'do-uong', '1 lon 330 ml', 145, 1.5, 12, 0],
    ['nuoc-ngot', 'Nước ngọt có ga', 'do-uong', '1 lon 330 ml', 140, 0, 35, 0],

    ['sua-chua', 'Sữa chua', 'an-vat', '1 hộp 100 g', 100, 3.5, 16, 2.5],
    ['banh-flan', 'Bánh flan', 'an-vat', '1 cái', 130, 4, 18, 4.5],
    ['che-dau-xanh', 'Chè đậu xanh', 'an-vat', '1 cốc', 250, 6, 50, 3],
    ['hat-dieu', 'Hạt điều', 'an-vat', '30 g', 165, 5, 9, 13],
    ['lac-rang', 'Lạc rang', 'an-vat', '30 g', 170, 7.5, 5, 14.5],
    ['khoai-tay-chien', 'Khoai tây chiên', 'an-vat', '1 phần vừa', 365, 4, 48, 17],
  ];

  const FOODS = RAW.map(([id, name, cat, serving, kcal, p, c, f]) => ({ id, name, cat, serving, kcal, p, c, f }));

  /* Gợi ý bữa ăn ghép sẵn: [id món, số phần] */
  const COMBOS = {
    breakfast: [
      { name: 'Phở gà', items: [['pho-ga', 1]] },
      { name: 'Bánh mì trứng và sữa tươi không đường', items: [['banh-mi-trung', 1], ['sua-tuoi', 1]] },
      { name: 'Yến mạch, chuối và sữa chua', items: [['yen-mach', 1], ['chuoi', 1], ['sua-chua', 1]] },
      { name: '2 trứng luộc, khoai lang, cà phê đen', items: [['trung-luoc', 2], ['khoai-lang', 1], ['cafe-den', 1]] },
      { name: 'Bánh cuốn', items: [['banh-cuon', 1]] },
      { name: 'Cháo gà và 1 quả cam', items: [['chao-ga', 1], ['cam', 1]] },
      { name: 'Xôi xéo', items: [['xoi-xeo', 1]] },
      { name: 'Bún riêu cua', items: [['bun-rieu', 1]] },
    ],
    lunch: [
      { name: 'Cơm, cá kho, rau muống xào, canh rau ngót', items: [['com-trang', 1], ['ca-kho', 1], ['rau-muong-xao', 1], ['canh-rau-ngot', 1]] },
      { name: 'Cơm gạo lứt, 150 g ức gà, rau luộc, canh chua', items: [['com-gao-lut', 1], ['uc-ga', 1.5], ['rau-luoc', 1], ['canh-chua', 1]] },
      { name: 'Bún chả', items: [['bun-cha', 1]] },
      { name: 'Cơm tấm sườn bì chả', items: [['com-tam', 1]] },
      { name: 'Bún thịt nướng', items: [['bun-thit-nuong', 1]] },
      { name: 'Cơm, 150 g đậu phụ, tôm luộc, rau luộc', items: [['com-trang', 1], ['dau-phu', 1.5], ['tom-luoc', 1], ['rau-luoc', 1]] },
      { name: 'Phở bò tái', items: [['pho-bo', 1]] },
      { name: '4 cuốn gỏi cuốn và 1 quả chuối', items: [['goi-cuon', 4], ['chuoi', 1]] },
    ],
    dinner: [
      { name: 'Nửa bát cơm, 150 g cá hấp, rau luộc, canh chua', items: [['com-trang', 0.5], ['ca-ro-phi', 1.5], ['rau-luoc', 1], ['canh-chua', 1]] },
      { name: '150 g ức gà, salad, khoai lang', items: [['uc-ga', 1.5], ['salad', 1], ['khoai-lang', 1]] },
      { name: 'Cơm, thịt lợn nạc luộc, rau muống xào', items: [['com-trang', 1], ['thit-lon-nac', 1], ['rau-muong-xao', 1]] },
      { name: 'Cơm gạo lứt, 200 g đậu phụ, canh rau ngót', items: [['com-gao-lut', 1], ['dau-phu', 2], ['canh-rau-ngot', 1]] },
      { name: '150 g tôm luộc, rau luộc, 1 bắp ngô', items: [['tom-luoc', 1.5], ['rau-luoc', 1], ['ngo-luoc', 1]] },
      { name: 'Bún riêu cua', items: [['bun-rieu', 1]] },
      { name: 'Cháo gà', items: [['chao-ga', 1]] },
    ],
    snack: [
      { name: '1 quả ổi', items: [['oi', 1]] },
      { name: '1 quả táo', items: [['tao', 1]] },
      { name: '1 hộp sữa chua', items: [['sua-chua', 1]] },
      { name: '1 quả chuối', items: [['chuoi', 1]] },
      { name: '1 miếng dưa hấu', items: [['dua-hau', 1]] },
      { name: '30 g hạt điều', items: [['hat-dieu', 1]] },
      { name: 'Sữa chua và 1 quả cam', items: [['sua-chua', 1], ['cam', 1]] },
    ],
  };

  return { FOOD_CATEGORIES, FOODS, COMBOS };
});
