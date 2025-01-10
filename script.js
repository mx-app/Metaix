window.onload = () => {
    const tg = window.Telegram.WebApp;

    // عرض بيانات المستخدم
    const user = tg.initDataUnsafe?.user;

    if (user) {
      // التحقق من الصورة الشخصية
      if (user.photo_url) {
        // إذا كانت صورة الملف الشخصي موجودة، قم بعرضها مباشرة
        document.getElementById('user-photo').src = user.photo_url;
      } else {
        // إذا لم تكن الصورة متوفرة، استخدم صورة افتراضية
        document.getElementById('user-photo').src = "https://via.placeholder.com/150";
      }

      // عرض الاسم واليوزرنيم
      document.getElementById('username').textContent = user.first_name || "اسم غير معروف";
      document.getElementById('user-username').textContent = user.username ? `@${user.username}` : "لا يوجد يوزر";
      document.getElementById('user-id').textContent = user.id || "غير معروف";
    } else {
      console.error("لا يمكن جلب بيانات المستخدم!");
      alert("لا يمكن جلب بيانات المستخدم!");
    }
  };

  // نسخ الأيدي إلى الحافظة
  function copyId() {
    const userId = document.getElementById('user-id').textContent;
    navigator.clipboard.writeText(userId).then(() => {
      alert('تم نسخ الأيدي!');
    });
  }
