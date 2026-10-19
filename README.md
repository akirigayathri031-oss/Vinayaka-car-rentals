# Vinayaka Car Rentals – website

Ertiga rental site: home page with car details, fare calculator (1 day, 2 days, 3+ days),
login, sign up, booking, "My bookings", and an owner panel.

## Run it

Needs Node.js 18 or newer. Nothing to install.

    cd vinayaka
    ADMIN_KEY=choose-a-secret node server.js

Open http://localhost:3000 (change the port with `PORT=8080`).
The owner panel is at http://localhost:3000/admin.html and needs the ADMIN_KEY you set.

## Change prices  →  data/config.json

| Setting | Meaning |
|---|---|
| ratePerKm | With driver, ₹ per km |
| minKmPerDay | Minimum km billed per day on outstation trips |
| driverBataPerDay | Driver allowance per day |
| transferMaxKm / transferRatePerKm / minTransferFare | Short one-day trips (like the airport drop) |
| selfDrivePerDay / selfKmLimitPerDay / selfExtraPerKm / selfDeposit | Self drive |
| maxPassengers | Seats offered on the booking form |

These are placeholder numbers. Put in your real rates.

## Change destinations and distances  →  data/places.json

Each place has a name, state and `km` (one-way road distance from Jadcherla).
Distances are approximate – check them and edit as needed. Add or remove places freely.

## How booking works

1. Customer picks destination, days and pickup date and sees the fare.
2. Customer signs up / logs in (mobile number + password) and books.
3. The request shows as Pending. The owner confirms or rejects it in /admin.html.
4. Confirmed dates are blocked for other customers.
5. After booking, the customer can send the details to the owner on WhatsApp.

Bookings and users are stored in `data/db.json` (created automatically). Back it up.
There is no online payment.

## Deploy on Vercel

1. Push this folder to a GitHub repository.
2. In Vercel: Add New > Project > import the repository. Framework Preset: Other. Deploy.
3. In the project: Storage > connect an Upstash Redis database (free plan). Vercel adds the database variables for you.
4. In Settings > Environment Variables add `ADMIN_KEY` (your secret for /admin.html).
5. Deployments > Redeploy. Open the site.

Vercel has no permanent disk, so on Vercel users and bookings are kept in Upstash Redis.
On your own computer the site still uses `data/db.json`.
