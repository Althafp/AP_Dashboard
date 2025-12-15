const { Client } = require('ssh2');

// 🔐 SSH credentials
const SSH_CONFIG = {
  host: '172.30.114.239',
  port: 22,
  username: 'root',
  password: 'M@t61x!@143', // ⚠️ Replace with your actual password
};

// 📄 File path on server
const FILE_PATH = '/opt/gpu_usage.csv';

/**
 * Get file content from remote server via SSH
 * @returns {Promise<string>} File content as string
 */
async function get_data() {
  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on('ready', () => {
      console.log('✅ SSH Connected');

      // Command to read file
      const command = `cat ${FILE_PATH}`;

      conn.exec(command, (err, stream) => {
        if (err) {
          console.error('❌ Exec error:', err);
          conn.end();
          reject(err);
          return;
        }

        let fileContent = '';
        let errorOutput = '';

        stream
          .on('close', (code, signal) => {
            console.log(`\n🔚 Command finished with code: ${code}`);
            conn.end();
            
            if (code !== 0) {
              reject(new Error(`Command failed with code ${code}. Error: ${errorOutput}`));
            } else {
              console.log('📄 File content retrieved successfully');
              resolve(fileContent);
            }
          })
          .on('data', (data) => {
            fileContent += data.toString();
          })
          .stderr.on('data', (data) => {
            errorOutput += data.toString();
            console.error('⚠️ STDERR:', data.toString());
          });
      });
    });

    conn.on('error', (err) => {
      console.error('❌ SSH Error:', err.message);
      reject(err);
    });

    // Connect to SSH server
    conn.connect(SSH_CONFIG);
  });
}

// Example usage
async function main() {
  try {
    const fileContent = await get_data();
    console.log('\n📄 File Content:');
    console.log('='.repeat(50));
    console.log(fileContent);
    console.log('='.repeat(50));
  } catch (error) {
    console.error('❌ Error getting file:', error.message);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

// Export for use in other modules
module.exports = { get_data, SSH_CONFIG, FILE_PATH };