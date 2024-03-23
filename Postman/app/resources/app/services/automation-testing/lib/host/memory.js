const os = require('os');

const BYTES_TO_MB_MULTIPLIER = 1024 * 1024;

/**
 * Get the memory information
 *
 * @returns {{total: number, available: number, active: number, used: number, free: number}}
 */
function getMemoryInformation () {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;

  return {
    total: totalMemory / BYTES_TO_MB_MULTIPLIER,
    free: freeMemory / BYTES_TO_MB_MULTIPLIER,
    used: usedMemory / BYTES_TO_MB_MULTIPLIER,
    active: (os.totalmem() - os.freemem()) / BYTES_TO_MB_MULTIPLIER,
    available: os.freemem() / BYTES_TO_MB_MULTIPLIER,
  };
}

module.exports = {
  getMemoryInformation,
  BYTES_TO_MB_MULTIPLIER
};
