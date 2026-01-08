export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || 'shinsei-shonin-demo-secret-key',
  jwtExpiresIn: '24h',
};
