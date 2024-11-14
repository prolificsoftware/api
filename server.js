const express = require('express')
const {
    dbConnect
} = require('./utiles/db')
const app = express()
const cors = require('cors')
const http = require('http')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
require('dotenv').config()
const socket = require('socket.io')

const server = http.createServer(app)

app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'https://estore-6wln.onrender.com'],
    credentials: true
}))

const io = socket(server, {
    cors: {
        origin: '*',
        credentials: true
    }
})


var allCustomer = []
var allSeller = []

const addUser = (customerId, socketId, userInfo) => {
    const checkUser = allCustomer.some(u => u.customerId === customerId)
    if (!checkUser) {
        allCustomer.push({
            customerId,
            socketId,
            userInfo
        })
    }
}


const addSeller = (sellerId, socketId, userInfo) => {
    const chaeckSeller = allSeller.some(u => u.sellerId === sellerId)
    if (!chaeckSeller) {
        allSeller.push({
            sellerId,
            socketId,
            userInfo
        })
    }
}


const findCustomer = (customerId) => {
    return allCustomer.find(c => c.customerId === customerId)
}
const findSeller = (sellerId) => {
    return allSeller.find(c => c.sellerId === sellerId)
}

const remove = (socketId) => {
    allCustomer = allCustomer.filter(c => c.socketId !== socketId)
    allSeller = allSeller.filter(c => c.socketId !== socketId)
}

let admin = {}

const removeAdmin = (socketId) => {
    if (admin.socketId === socketId) {
        admin = {}
    }
}

io.on('connection', (soc) => {
    console.log('socket server is connected...')

    soc.on('add_user', (customerId, userInfo) => {
        addUser(customerId, soc.id, userInfo)
        io.emit('activeSeller', allSeller)
        io.emit('activeCustomer', allCustomer)
    })
    soc.on('add_seller', (sellerId, userInfo) => {
        addSeller(sellerId, soc.id, userInfo)
        io.emit('activeSeller', allSeller)
        io.emit('activeCustomer', allCustomer)
        io.emit('activeAdmin', { status: true })

    })

    soc.on('add_admin', (adminInfo) => {
        delete adminInfo.email
        admin = adminInfo
        admin.socketId = soc.id
        io.emit('activeSeller', allSeller)
        io.emit('activeAdmin', { status: true })

    })
    soc.on('send_seller_message', (msg) => {
        const customer = findCustomer(msg.receverId)
        if (customer !== undefined) {
            soc.to(customer.socketId).emit('seller_message', msg)
        }
    })

    soc.on('send_customer_message', (msg) => {
        const seller = findSeller(msg.receverId)
        if (seller !== undefined) {
            soc.to(seller.socketId).emit('customer_message', msg)
        }
    })

    soc.on('send_message_admin_to_seller', msg => {
        const seller = findSeller(msg.receverId)
        if (seller !== undefined) {
            soc.to(seller.socketId).emit('receved_admin_message', msg)
        }
    })


    soc.on('send_message_seller_to_admin', msg => {

        if (admin.socketId) {
            soc.to(admin.socketId).emit('receved_seller_message', msg)
        }
    })


    soc.on('disconnect', () => {
        console.log('user disconnect')
        remove(soc.id)
        removeAdmin(soc.id)
        io.emit('activeAdmin', { status: false })
        io.emit('activeSeller', allSeller)
        io.emit('activeCustomer', allCustomer)

    })
})

app.use(bodyParser.json())
app.use(cookieParser())


app.use('/api', require('./routes/chatRoutes'))


app.use('/api', require('./routes/paymentRoutes'))
app.use('/api', require('./routes/bannerRoutes'))
app.use('/api', require('./routes/dashboard/dashboardIndexRoutes'))

app.use('/api/home', require('./routes/home/homeRoutes'))
app.use('/api', require('./routes/order/orderRoutes'))
app.use('/api', require('./routes/home/cardRoutes'))
app.use('/api', require('./routes/authRoutes'))
app.use('/api', require('./routes/home/customerAuthRoutes'))
app.use('/api', require('./routes/dashboard/sellerRoutes'))
app.use('/api', require('./routes/dashboard/categoryRoutes'))
app.use('/api', require('./routes/dashboard/productRoutes'))
app.get('/', (req, res) => res.send('Hello World!'))

const mongoose = require('mongoose');
const admins = require('./models/adminModel');  // Assuming the model is in the models folder
const bcrypt = require('bcryptjs'); // For password hashing
// eslint-disable-next-line no-undef


const  createDefaultAdmin = async () => {
  try {
      const adminExists = await admins.findOne({ email: 'admin@runorx.com' }); // Checking if admin already exists

      if (!adminExists) {
          const hashedPassword = await bcrypt.hash('Admin.1234', 10); // Hash the password

          const defaultAdmin = new admins({
              name: 'runorx',
              email: 'admin@runorx.com',
              password: hashedPassword, // Store the hashed password
              image: ' ', // You can replace it with any default image URL
              role: 'admin'
          });

          await defaultAdmin.save();
          console.log('admin created successfully');
      } else {
          console.log('Admin already exists');
      }
  } catch (error) {
      console.error('Error creating default admin:', error);
  }

};





const port = process.env.PORT;

dbConnect().then(() => {
createDefaultAdmin();  // After the DB connection, create the default admin
});
server.listen(port, () => console.log(`Server is running on port ${port}!`));

// dbConnect()
// server.listen(port, () => console.log(`Server is running on port ${port}!`))