export const config = {
  port: process.env.PORT || 3001,
  jwtSecret: process.env.JWT_SECRET || 'shinsei-shonin-demo-secret-key',
  jwtExpiresIn: '24h',
};
