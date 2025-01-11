const uiElements = {
    balanceDisplay: document.getElementById('balanceAmount'),
    userTelegramNameDisplay: document.getElementById('userTelegramName'),
    userTelegramIdDisplay: document.getElementById('userTelegramId'),
    purchaseNotification: document.getElementById('purchaseNotification'),
    copyInviteNotification: document.getElementById('copyInviteNotification'),
    navButtons: document.querySelectorAll('.menu button'),
    contentScreens: document.querySelectorAll('.screen-content'),
    splashScreen: document.querySelector('.splash-screen'),
    mainContainer: document.querySelector('.container'),
    userTelegramNameDisplay: document.getElementById('userTelegramName'),
    userTelegramIdDisplay: document.getElementById('userTelegramId'),
    friendsListDisplay: document.getElementById('friendsList') || { innerHTML: '' },
    inviteFriendsBtn: document.getElementById('inviteFriendsBtn'),
    copyInviteLinkBtn: document.getElementById('copyInviteLinkBtn'),
};


//تحديث البيانت من الواجهه الي قاعده البيانات 
async function updateGameStateInDatabase(updatedData) {
    const userId = uiElements.userTelegramIdDisplay.innerText;

    try {
        const { data, error } = await supabase
            .from('users')
            .update(updatedData) // البيانات الجديدة
            .eq('telegram_id', userId); // شرط التحديث

        if (error) {
            console.error('Error updating game state in Supabase:', error);
            return false;
        }

        console.log('Game state updated successfully in Supabase:', data);
        return true;
    } catch (err) {
        console.error('Unexpected error while updating game state:', err);
        return false;
    }
}



//تحديث قاعده البيانات 
async function loadGameState() {
    const userId = uiElements.userTelegramIdDisplay.innerText;

    try {
        console.log('Loading game state from Supabase...');
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', userId)
            .single();

        if (error) {
            console.error('Error loading game state from Supabase:', error.message);
            return;
        }

        if (data) {
            console.log('Loaded game state:', data); // عرض البيانات المحملة
            gameState = { ...gameState, ...data };
            //updateUI();
        } else {
            console.warn('No game state found for this user.');
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}


document.addEventListener('DOMContentLoaded', async () => {
    const isBanned = await checkAndHandleBan();
    if (isBanned) return; 
    await loadGameState(); 
    await initializeApp();  
});


async function initializeApp() {
    try {
        console.log('Initializing app...');

        // جلب بيانات المستخدم من Telegram وSupabase
        await fetchUserDataFromTelegram();

        // إخفاء شاشة البداية وعرض المحتوى الرئيسي
         setTimeout(() => {
       if (uiElements.splashScreen) uiElements.splashScreen.style.display = 'none';
       if (uiElements.mainContainer) uiElements.mainContainer.style.display = 'flex';
    }, 2000);
        
        //updateUI();
        registerEventHandlers();
        
        console.log('App initialized successfully.');
    } catch (error) {
        console.error('Error initializing app:', error);
        showNotification(uiElements.purchaseNotification, 'Failed to initialize app.');
        if (uiElements.splashScreen) uiElements.splashScreen.style.display = 'none';
        if (uiElements.mainContainer) uiElements.mainContainer.style.display = 'flex';
    }
}



async function fetchUserDataFromTelegram() {
    try {
        const telegramApp = window.Telegram.WebApp;
        telegramApp.ready();

        const user = telegramApp.initDataUnsafe.user;
        const userTelegramId = user?.id;
        const userTelegramName = user?.username || `user_${userTelegramId}`;
        const isPremium = user?.is_premium;

        if (!userTelegramId) {
            throw new Error("Failed to fetch Telegram user ID.");
        }

        // تحديث واجهة المستخدم
        if (uiElements?.userTelegramIdDisplay) {
            uiElements.userTelegramIdDisplay.innerText = userTelegramId;
        }
        if (uiElements?.userTelegramNameDisplay) {
            uiElements.userTelegramNameDisplay.innerText = userTelegramName;
        }

        // عرض الاسم المختصر
        const userNameElement = document.getElementById("userName");
        if (userNameElement) {
            const maxLength = 4;
            const truncatedName = userTelegramName.length > maxLength
                ? userTelegramName.slice(0, maxLength) + "..."
                : userTelegramName;
            userNameElement.innerText = truncatedName;
        }

        // عرض حالة Premium
        const premiumStatusElement = document.getElementById('userPremiumStatus');
        if (premiumStatusElement) {
            premiumStatusElement.innerHTML = isPremium
                ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 12l2 2l4 -4" /></svg>`
                : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="Error-mark"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>`;
        }

        // عرض الصورة الشخصية
        const userPhotoElement = document.getElementById('user-photo');
        if (userPhotoElement) {
            userPhotoElement.src = user?.photo_url || "https://via.placeholder.com/150";
        }

        // التحقق من تسجيل المستخدم
        await ensureUserAuthenticationAndDatabase(userTelegramId, userTelegramName);
    } catch (error) {
        console.error("Error fetching Telegram user data:", error.message);
    }
}

// وظيفة التحقق أو تسجيل المستخدم في المصادقة وقاعدة البيانات
async function ensureUserAuthenticationAndDatabase(telegramId, userName) {
    try {
        const email = `${telegramId}@SawToken.coin`;
        const password = `password_${telegramId}`;

        // 1. التحقق من وجود المستخدم في نظام المصادقة
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        
        if (loginError) {
            console.log("User not found in auth system. Registering...");
            // تسجيل المستخدم في المصادقة إذا لم يكن موجودًا
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
            if (signUpError) throw new Error(`Failed to register user: ${signUpError.message}`);
            console.log("User registered in auth system:", signUpData.user.id);
        } else {
            console.log("User logged in successfully:", loginData.user.id);
        }

        // 2. التحقق من وجود المستخدم في قاعدة البيانات
        const { data: userData, error: userError } = await supabase
            .from("users")
            .select("*")
            .eq("telegram_id", telegramId)
            .maybeSingle();

        if (userError) throw new Error(`Error fetching user data: ${userError.message}`);

        // إضافة المستخدم إذا لم يكن موجودًا في قاعدة البيانات
        if (!userData) {
            console.log("User not found in database. Adding user...");
            const { error: insertError } = await supabase
                .from("users")
                .insert({ telegram_id: telegramId, username: userName, balance: 0 });
            if (insertError) throw new Error(`Failed to insert user data: ${insertError.message}`);
            console.log("User added to database successfully.");
        } else {
            console.log("User already exists in database.");
        }

    } catch (error) {
        console.error("Error ensuring user authentication and database:", error.message);
        throw error;
    }
}

// القائمه السفليه
document.querySelectorAll('button[data-target]').forEach(button => {
    button.addEventListener('click', () => {
        const targetId = button.getAttribute('data-target');
        document.querySelectorAll('.screen-content').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(targetId).classList.add('active');
    });
});

// أولاً: الحصول على جميع الأزرار داخل القائمة
const buttons = document.querySelectorAll('.menu button');

// ثانياً: إضافة مستمع للأحداث (Event Listener) لكل زر بحيث يستمع للنقرات
buttons.forEach(button => {
    button.addEventListener('click', function() {
        // عند النقر على زر، يتم إزالة الصف "active" من جميع الأزرار
        buttons.forEach(btn => btn.classList.remove('active'));
        
        // إضافة الصف "active" للزر الذي تم النقر عليه
        this.classList.add('active');
        
        // الحصول على اسم الصفحة أو القسم المستهدف من الزر الذي تم النقر عليه
        const targetPage = this.getAttribute('data-target');
        
        // عرض القسم المناسب
        document.querySelectorAll('.screen-content').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(targetPage).classList.add('active');
    });
});

// ثالثاً: تفعيل الزر الافتراضي (الصفحة الرئيسية)
window.addEventListener('DOMContentLoaded', () => {
    const defaultButton = document.querySelector('button[data-target="mainPage"]'); // افترض أن الصفحة الرئيسية لها data-target="mainPage"
    if (defaultButton) {
        defaultButton.classList.add('active'); // تفعيل الزر افتراضياً
        const defaultScreen = document.getElementById('mainPage'); // افترض أن الصفحة الرئيسية لها ID="mainPage"
        if (defaultScreen) {
            defaultScreen.classList.add('active'); // عرض الشاشة المرتبطة افتراضياً
        }
    }
});



// المهام 
document.addEventListener('DOMContentLoaded', async () => {
    const taskContainer = document.querySelector('#taskcontainer');
    if (!taskContainer) {
        console.error('Task container element not found.');
        return;
    }

    // جلب المهام المكتملة من قاعدة البيانات
    const userId = uiElements.userTelegramIdDisplay.innerText;
    let completedTasks = [];

    try {
        const { data, error } = await supabase
            .from('users')
            .select('completed_tasks')
            .eq('telegram_id', userId)
            .single();

        if (error) {
            console.error('Error fetching completed tasks:', error);
        } else {
            completedTasks = data?.completed_tasks || [];
        }
    } catch (err) {
        console.error('Unexpected error while fetching completed tasks:', err);
    }

    // جلب قائمة المهام من ملف JSON
    fetch('json/tasks.json')
        .then(response => response.json())
        .then(tasks => {
            tasks.forEach(task => {
                const taskElement = document.createElement('div');
                taskElement.classList.add('task-item');

                // صورة المهمة
                const img = document.createElement('img');
                img.src = task.image;
                img.alt = 'Task Image';
                img.classList.add('task-img');
                taskElement.appendChild(img);

                 // Create a container for description and reward
                const infoContainer = document.createElement('div');
                infoContainer.classList.add('info-task'); // This will hold both description and reward

                // Task Description
                const description = document.createElement('p');
                description.textContent = task.description;
                infoContainer.appendChild(description);

                 // Task Reward without Coin Image
                const rewardContainer = document.createElement('div');
                rewardContainer.classList.add('task-reward-container');
            
                const rewardText = document.createElement('span');
                rewardText.textContent = `+ ${task.reward} $SAW`;
                rewardText.classList.add('task-reward');
                rewardContainer.appendChild(rewardText);

                infoContainer.appendChild(rewardContainer); // Append reward below description

                taskElement.appendChild(infoContainer); // Append the info container to the task element

           
                // زر المهمة
                const button = document.createElement('button');
                 button.classList.add('task-button');
                 button.setAttribute('data-task-id', task.id);
                 button.setAttribute('data-reward', task.reward);

                 // تعيين نص الزر بناءً على حالة المهمة
                 if (completedTasks.includes(task.id)) {
                 // علامة الصح
                 button.innerHTML = `
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                   <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                 </svg>
                `;
                 button.disabled = true;
             } else {
                // السهم
                 button.innerHTML = `
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="arrow">
                     <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                   </svg>
                 `;
                }

               taskElement.appendChild(button);
               taskContainer.appendChild(taskElement);

                // التعامل مع النقر على الزر
                let taskProgress = 0;

                button.addEventListener('click', () => {
                    if (taskProgress === 0) {
                        showLoading(button);
                        openTaskLink(task.url, () => {
                            taskProgress = 1;
                            hideLoading(button, 'Verify');
                        });
                    } else if (taskProgress === 1) {
                        showLoading(button);
                        setTimeout(() => {
                            taskProgress = 2;
                            hideLoading(button, 'Claim');
                        }, 5000);
                    } else if (taskProgress === 2) {
                        claimTaskReward(task.id, task.reward, button);
                    }
                });
            });
        })
        .catch(error => console.error('Error fetching tasks:', error));
});

// استلام المكافأة وتحديث قاعدة البيانات
async function claimTaskReward(taskId, reward, button) {
    try {
        // التحقق إذا كانت المهمة مكتملة مسبقًا
        const userId = uiElements.userTelegramIdDisplay.innerText;
        const { data, error } = await supabase
            .from('users')
            .select('completed_tasks')
            .eq('telegram_id', userId)
            .single();

        if (error) {
            console.error('Error fetching completed tasks:', error);
            return;
        }

        const completedTasks = data?.completed_tasks || [];
        if (completedTasks.includes(taskId)) {
            showNotification(uiElements.purchaseNotification, 'You have already claimed this reward.');
            return;
        }

        // إضافة المكافأة إلى الرصيد
        gameState.balance += reward;
        completedTasks.push(taskId);

        // تحديث واجهة المستخدم
        button.textContent = '✓';
        button.disabled = true;
       // updateUI();
        showNotificationWithStatus(uiElements.purchaseNotification, `Successfully claimed ${reward} coins!`, 'win');

        // تحديث قاعدة البيانات
        const updatedData = {
            balance: gameState.balance,
            completed_tasks: completedTasks,
        };

        const { updateError } = await supabase
            .from('users')
            .update(updatedData)
            .eq('telegram_id', userId);

        if (updateError) {
            console.error('Error updating completed tasks:', updateError);
        }
    } catch (error) {
        console.error('Error claiming task reward:', error);
    }
}

// عرض التحميل
function showLoading(button) {
    button.innerHTML = `<span class="loading-spinner"></span>`;
    button.disabled = true;
}

function hideLoading(button, text) {
    button.disabled = false;
    button.innerHTML = text;
}

// فتح رابط المهمة
function openTaskLink(taskurl, callback) {
    if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
        Telegram.WebApp.openLink(taskurl, { try_instant_view: true });
        setTimeout(callback, 1000);
    } else {
        window.open(taskurl, '_blank');
        setTimeout(callback, 1000);
    }
}


const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
    manifestUrl: 'https://sawcoin.vercel.app/json/tonconnect-manifest.json',
    buttonRootId: 'ton-connect'
});

async function connectToWallet() {
    const connectedWallet = await tonConnectUI.connectWallet();
    // يمكنك تنفيذ بعض العمليات باستخدام connectedWallet إذا لزم الأمر
    console.log(connectedWallet);
}

tonConnectUI.uiOptions = {
    twaReturnUrl: 'https://t.me/SAWCOIN_BOT/GAME'
};



function navigateToScreen(screenId) {
    if (uiElements.contentScreens) {
        uiElements.contentScreens.forEach(screen => {
            screen.classList.remove('active');
        });
    }
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) targetScreen.classList.add('active');

    // دائمًا إظهار القائمة السفلية بغض النظر عن الشاشة
    const footerMenu = document.querySelector('.menu'); // تحديد القائمة السفلية باستخدام الكلاس
    if (footerMenu) {
        footerMenu.style.display = 'flex'; // التأكد من أن القائمة السفلية تظهر دائمًا
    }
}

///////////////////////////////////////



 // تحسين عرض قائمة الأصدقاء مع حد أقصى 10 أصدقاء
async function loadFriendsList() {
    const userId = uiElements.userTelegramIdDisplay.innerText;

    // عناصر HTML الجديدة
    const friendsMessage = document.getElementById('friendsMessage');
    const friendsList = uiElements.friendsListDisplay;

    if (!userId) {
        console.error("User ID is missing.");
        friendsMessage.innerText = "Error: Unable to load friends list. Please try again later.";
        friendsMessage.classList.remove('hidden');
        friendsList.innerHTML = ''; // مسح القائمة
        return;
    }

    try {
        const { data, error } = await supabase
            .from('users')
            .select('invites')
            .eq('telegram_id', userId)
            .single();

        if (error) {
            console.error('Error fetching friends list:', error.message);
            friendsMessage.innerText = "Error: Unable to fetch friends at the moment.";
            friendsMessage.classList.remove('hidden');
            friendsList.innerHTML = ''; // مسح القائمة
            return;
        }

        if (data && data.invites && Array.isArray(data.invites) && data.invites.length > 0) {
            friendsMessage.classList.add('hidden'); // إخفاء الرسالة
            friendsList.innerHTML = ''; // مسح القائمة القديمة

            const uniqueInvites = [...new Set(data.invites)];
            const limitedInvites = uniqueInvites.slice(0, 10);

            const friendsPromises = limitedInvites.map(async (friendId) => {
                const { data: friendData, error: friendError } = await supabase
                    .from('users')
                    .select('telegram_id, balance')
                    .eq('telegram_id', friendId)
                    .single();

                if (friendError) {
                    console.error(`Error fetching data for friend ${friendId}:`, friendError.message);
                    return null;
                }

                return friendData;
            });

            const friendsData = await Promise.all(friendsPromises);

            friendsData.forEach((friend) => {
                if (friend) {
                    const li = document.createElement('li');
                    li.classList.add('friend-item');

                    const img = document.createElement('img');
                    img.src = 'i/users.jpg';
                    img.alt = `${friend.telegram_id} Avatar`;
                    img.classList.add('friend-avatar');

                    const span = document.createElement('span');
                    span.classList.add('friend-name');
                    span.textContent = `ID : ${friend.telegram_id}`;

                    const balanceSpan = document.createElement('span');
                    balanceSpan.classList.add('friend-balance');
                    balanceSpan.textContent = `${formatNumber(friend.balance)} $SAW`;

                    const friendInfoDiv = document.createElement('div');
                    friendInfoDiv.classList.add('friend-info');
                    friendInfoDiv.appendChild(img);
                    friendInfoDiv.appendChild(span);

                    li.appendChild(friendInfoDiv);
                    li.appendChild(balanceSpan);

                    friendsList.appendChild(li);
                }
            });

            const totalFriendsCount = uniqueInvites.length;
            document.getElementById('invitedCount').innerText = totalFriendsCount;
            document.getElementById('settingsInvitedCount').innerText = totalFriendsCount;
        } else {
            friendsMessage.innerText = "No friends invited yet.";
            friendsMessage.classList.remove('hidden');
            friendsList.innerHTML = ''; // مسح القائمة
            document.getElementById('invitedCount').innerText = 0;
            document.getElementById('settingsInvitedCount').innerText = 0;
        }
    } catch (err) {
        console.error("Unexpected error loading friends list:", err);
        friendsMessage.innerText = "Error: Unexpected issue occurred while loading friends.";
        friendsMessage.classList.remove('hidden');
        friendsList.innerHTML = ''; // مسح القائمة
    }
 }


// نسخ رابط الدعوة
function copyInviteLink() {
    const inviteLink = `https://t.me/SAWCOIN_BOT?start=${uiElements.userTelegramIdDisplay?.innerText || ''}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
        showNotification(uiElements.copyInviteNotification, 'Invite link copied!');
    }).catch(err => {
        showNotification(uiElements.purchaseNotification, 'Failed to copy invite link.');
    });
}

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './Scripts/config.js';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// مشاركة الدعوة عبر Telegram
function openTelegramChat() {
    const inviteLink = `https://t.me/share/url?text=Join Metaix Game and earn 5,000 $METIX!&url=https://t.me/SAWCOIN_BOT?start=${uiElements.userTelegramIdDisplay?.innerText || ''}`;
    window.open(inviteLink, '_blank');
}


function registerEventHandlers() {
    if (uiElements.navButtons) {
        uiElements.navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetScreen = button.getAttribute('data-target');
                navigateToScreen(targetScreen);
            });
        });
    }
} 


function copyId() {
    const userId = document.getElementById('user-id').textContent;
    navigator.clipboard.writeText(userId).then(() => {
      alert('Hands copied');
    });
  }



async function checkAndHandleBan() {
    const userId = uiElements.userTelegramIdDisplay.innerText;

    try {
        // جلب حالة الحظر من قاعدة البيانات
        const { data, error } = await supabase
            .from('users')
            .select('is_banned')
            .eq('telegram_id', userId)
            .single();

        if (error) {
            console.error('Error checking ban status:', error.message);
            return false;
        }

        if (data?.is_banned) {
            showBanScreen(); // إذا كان المستخدم محظورًا، عرض شاشة الحظر
            return true; // المستخدم محظور
        }

        return false; // المستخدم غير محظور
    } catch (err) {
        console.error('Unexpected error while checking ban status:', err);
        return false;
    }
}


function showBanScreen() {
    // إنشاء طبقة تغطي الشاشة بالكامل لمنع التفاعل
    const overlay = document.createElement('div');
    overlay.id = 'banOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(0, 0, 0, 1);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 99999;
    `;

    // محتوى شاشة الحظر
    const content = document.createElement('div');
    content.style.cssText = `
        text-align: center;
        color: white;
    `;

    const banImage = document.createElement('img');
    banImage.src = 'i/bloomer.jpg'; // استبدل بمسار الصورة
    banImage.alt = 'Banned';
    banImage.style.cssText = 'width: 170px; margin-bottom: 20px;';

    const banMessage = document.createElement('p');
    banMessage.textContent = 'Your account has been banned for violating policies If you think this is an error please contact support';
    banMessage.style.cssText = 'font-size: 17px; margin-bottom: 20px;';

    const contactSupport = document.createElement('button');
    contactSupport.textContent = 'Contact support';
    contactSupport.style.cssText = `
        padding: 10px 30px;
        background-color: #fff;
        color: #000;
        border: none;
        font-weight: bold;
        border-radius: 20px;
        cursor: pointer;
    `;
    contactSupport.onclick = () => {
        window.location.href = 'https://t.me/X7X_FLASH'; // استبدل بعنوان بريد الدعم
    };

    content.appendChild(banImage);
    content.appendChild(banMessage);
    content.appendChild(contactSupport);
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    // تعطيل التفاعل مع بقية الشاشة
    document.body.style.overflow = 'hidden';
}

////////////////////////////////////



// عرض الإشعارات للمستخدم
function showNotification(notificationElement, message) {
    if (!notificationElement) return;
    notificationElement.innerText = message;
    notificationElement.classList.add('show');
    setTimeout(() => {
        notificationElement.classList.remove('show');
    }, 4000);
}

function showNotificationWithStatus(notificationElement, message, status = '') {
    if (!notificationElement) return;

    // مسح الفئات السابقة للفوز أو الخسارة أو الخطأ أو الرسالة
    notificationElement.classList.remove('win', 'lose', 'error', 'message');

    // إعداد رابط الصورة بناءً على الحالة
    let imageUrl = '';
    if (status === 'win') {
        notificationElement.classList.add('win');
        imageUrl = 'i/done.png'; // رابط الصورة لحالة الفوز

        // إضافة تأثير القصاصات الورقية للاحتفال
        showConfettiEffect();
    } else if (status === 'lose') {
        notificationElement.classList.add('lose');
        imageUrl = 'i/mistake.png'; // رابط الصورة لحالة الخسارة
    } else if (status === 'error') {
        notificationElement.classList.add('error');
        imageUrl = 'i/error.png'; // رابط الصورة لحالة الخطأ
    } else if (status === 'message') {
        notificationElement.classList.add('message');
        imageUrl = 'i/message.png'; // رابط الصورة للإشعار العادي
    }

    // إضافة الصورة مع الرسالة باستخدام innerHTML
    notificationElement.innerHTML = `<img src="${imageUrl}" class="notification-image" alt=""> ${message}`;

    // إظهار الإشعار
    notificationElement.classList.add('show');

    // إخفاء الإشعار بعد 4 ثوانٍ
    setTimeout(() => {
        notificationElement.classList.remove('show');
    }, 4000);
}

// دالة لإظهار تأثير القصاصات الورقية
function showConfettiEffect() {
    const duration = 2 * 1000; // مدة التأثير (2 ثانية)
    const end = Date.now() + duration;

    (function frame() {
        confetti({
            particleCount: 7, // عدد الجزيئات في كل دفعة
            angle: 90,        // زاوية التساقط (عمودية)
            spread: 160,      // زاوية الانتشار
            startVelocity: 40, // سرعة البداية
            gravity: 0.7,     // الجاذبية
            origin: {
                x: Math.random(), // انطلاق من أماكن عشوائية
                y: 0              // البداية من أعلى الشاشة
            },
            colors: ['#FF5733', '#FFC300', '#DAF7A6', '#C70039', '#581845']
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    })();
}






// تفعيل التطبيق
initializeApp();
