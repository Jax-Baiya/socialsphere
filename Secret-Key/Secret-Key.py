import os

# Function to generate a secret key and store it
def generate_and_store_secret_key(file_name, folder_name="Secret-Key"):
    # Generate a secret key
    secret_key = os.urandom(16)
    # Convert the key to a hexadecimal string
    secret_key_hex = secret_key.hex()
    
    # Create the folder if it does not exist
    os.makedirs(folder_name, exist_ok=True)
    
    # Path for the file to store the secret key
    file_path = os.path.join(folder_name, file_name)
    
    # Store the hexadecimal string in the file
    with open(file_path, 'w') as file:
        file.write(secret_key_hex)
    
    print(f"Secret key stored in {file_path}")

# Usage
if __name__ == "__main__":
    # Specify the custom file name here
    custom_file_name = "JWT_SECRET_KEY"
    generate_and_store_secret_key(custom_file_name)