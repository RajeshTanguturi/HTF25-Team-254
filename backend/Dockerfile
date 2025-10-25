
FROM node:18-slim


RUN apt-get update && apt-get install -y \
    default-jdk \
    python3 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 3. Set up the working directory inside the container
WORKDIR /usr/src/app

# 4. Copy package files and install dependencies
# This is done first to leverage Docker's build cache
COPY package*.json ./
RUN npm install

# 5. Copy the rest of your application code
COPY . .

# 6. Define the command to start your server
CMD ["npm", "start"]