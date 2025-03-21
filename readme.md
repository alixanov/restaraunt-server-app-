# cafe routes

### GET "/workers/all" => barcha ishchini olish

### GET "/workers/:id" => 1 ta ishchini olish \_id da beriladi

### POST "/workers/create" => {

    {
        "fullname": "Bahromjon Ismoilov",
        "phone": "+79876543211",
        "password": "admin123",
        "login": "admin123",
        "role": "admin",
        "salary": 5000,
    }

}

### POST "/login

    {
        "login":"admin123",
        "password":"admin123"
    }

### DELETE "/workers/delete/:id" => \_id beriladi

### PUT "/workers/update/:id", => \_id beriladi

### PUT "/workers/status/:id", => aktive || noaktive qilish uchun \_id beriladi boshqa narsa kerak emas avtomatik true || false boladi

<!-- table -->

# Stol uchun

### GET "/tables/all" => barchasini oladi

### get "/tables/:id" => \_id boyicha 1 dona stol olish

### post "/tables/create" => yangi yaratish

    {
        "number":2,
        "capacity":3
    }

    // qolgan malumotlar avtomatik qoshiladi

### delete "/tables/delete/:id" => \_id boyicha o'chirish

### put "/tables/update/:id", => \_id boyicha update qilish

### put "/tables/status/:id", => stolni \_id sini paramsdan beriladi va avtomatil true || false almashadi
