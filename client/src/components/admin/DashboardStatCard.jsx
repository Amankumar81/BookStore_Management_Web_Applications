import { Card, CardContent, Typography, Box } from "@mui/material";

function DashboardStatCard({ title, value, subtitle, icon }) {
  return (
    <Card
      elevation={3}
      sx={{
        height: "100%",
        borderRadius: 3,
        transition: "0.2s",
        "&:hover": {
          transform: "translateY(-3px)",
          boxShadow: 6,
        },
      }}
    >
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box>
            <Typography color="text.secondary" variant="body2">
              {title}
            </Typography>

            <Typography
              variant="h4"
              fontWeight="bold"
              sx={{ mt: 1 }}
            >
              {value}
            </Typography>

            {subtitle && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1 }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>

          <Box
            sx={{
              fontSize: "35px",
              backgroundColor: "action.hover",
              borderRadius: "50%",
              width: 60,
              height: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default DashboardStatCard;