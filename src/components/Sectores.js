import React, { useEffect, useState } from "react";
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Modal,
  TextField,
  Button,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { getDatabase, ref, get, update } from "firebase/database";

const Sectores = () => {
  const db = getDatabase();
  const [sectores, setSectores] = useState([]);
  const [selectedSetorIndex, setSelectedSetorIndex] = useState(null);
  const [newSubsector, setNewSubsector] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [subsectorToDelete, setSubsectorToDelete] = useState(null);

  // Buscar setores do Firebase
  useEffect(() => {
    const fetchSectores = async () => {
      const dbRef = ref(db, "sectores_de_atividade");
      try {
        const snapshot = await get(dbRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          const sectoresArray = Object.keys(data).map((key) => data[key]);
          setSectores(sectoresArray);
        } else {
          console.log("Nenhum setor encontrado.");
        }
      } catch (error) {
        console.error("Erro ao buscar setores: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSectores();
  }, [db]);

  // Abrir modal com subsectores
  const handleOpenModal = (index) => {
    setSelectedSetorIndex(index);
    setOpenModal(true);
    setErrorMessage("");
  };

  // Fechar modal
  const handleCloseModal = () => {
    setOpenModal(false);
    setNewSubsector("");
    setErrorMessage("");
  };

  // Adicionar novo subsector
  const handleAddSubsector = async () => {
    if (!newSubsector.trim()) {
      setErrorMessage("O subsector não pode estar vazio.");
      return;
    }

    const subsectores = sectores[selectedSetorIndex].subsectores;
    const isDuplicate = subsectores.some(
      (subsector) => subsector.toLowerCase() === newSubsector.toLowerCase()
    );

    if (isDuplicate) {
      setErrorMessage("Este subsector já existe.");
      return;
    }

    try {
      const updatedSubsectores = [...subsectores, newSubsector];

      const setorRef = ref(db, `sectores_de_atividade/${selectedSetorIndex}`);
      await update(setorRef, { subsectores: updatedSubsectores });

      setSectores((prev) =>
        prev.map((setor, index) =>
          index === selectedSetorIndex
            ? { ...setor, subsectores: updatedSubsectores }
            : setor
        )
      );

      setNewSubsector("");
      setErrorMessage("");
    } catch (error) {
      console.error("Erro ao adicionar subsector: ", error);
      setErrorMessage("Erro ao adicionar subsector. Tente novamente.");
    }
  };

  // Abrir diálogo de confirmação para eliminar subsector
  const handleOpenDeleteConfirmation = (subsector) => {
    setSubsectorToDelete(subsector);
    setDeleteConfirmationOpen(true);
  };

  // Fechar diálogo de confirmação
  const handleCloseDeleteConfirmation = () => {
    setDeleteConfirmationOpen(false);
    setSubsectorToDelete(null);
  };

  // Eliminar subsector
  const handleDeleteSubsector = async () => {
    if (subsectorToDelete === null || selectedSetorIndex === null) return;

    try {
      const updatedSubsectores = sectores[selectedSetorIndex].subsectores.filter(
        (subsector) => subsector !== subsectorToDelete
      );

      const setorRef = ref(db, `sectores_de_atividade/${selectedSetorIndex}`);
      await update(setorRef, { subsectores: updatedSubsectores });

      setSectores((prev) =>
        prev.map((setor, index) =>
          index === selectedSetorIndex
            ? { ...setor, subsectores: updatedSubsectores }
            : setor
        )
      );

      handleCloseDeleteConfirmation();
    } catch (error) {
      console.error("Erro ao eliminar subsector: ", error);
    }
  };

  const listItemStyles = {
    backgroundColor: "#f5f5f5",
    marginBottom: "8px",
    borderRadius: "4px",
    "&:hover": { backgroundColor: "#e0e0e0" },
  };

  if (loading) {
    return <Typography>Carregando...</Typography>;
  }

  return (
    <Box className="p-8 bg-gray-50 min-h-screen">
      <Typography variant="h4" gutterBottom>
        Setores de Atividade
      </Typography>
      <List>
        {sectores.map((setor, index) => (
          <ListItem
            key={index}
            button
            onClick={() => handleOpenModal(index)}
            sx={listItemStyles}
          >
            <ListItemText primary={setor.setor} />
          </ListItem>
        ))}
      </List>

      {/* Modal para subsectores */}
      <Modal open={openModal} onClose={handleCloseModal}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            maxHeight: "80vh",
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
            borderRadius: "8px",
            overflowY: "auto",
          }}
        >
          <Typography variant="h6" gutterBottom>
            Subsectores de{" "}
            {selectedSetorIndex !== null
              ? sectores[selectedSetorIndex].setor
              : "Setor Desconhecido"}
          </Typography>
          <List>
            {selectedSetorIndex !== null &&
              sectores[selectedSetorIndex].subsectores.map((subsector, index) => (
                <ListItem key={index}>
                  <ListItemText primary={subsector} />
                  <IconButton
                    onClick={() => handleOpenDeleteConfirmation(subsector)}>
                    x
                  </IconButton>
                </ListItem>
              ))}
          </List>
          <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
            <TextField
              fullWidth
              label="Novo Subsector"
              value={newSubsector}
              onChange={(e) => setNewSubsector(e.target.value)}
              error={!!errorMessage}
              helperText={errorMessage}
            />
            <Button variant="contained" onClick={handleAddSubsector}>
              DONE
            </Button>
            <Button variant="outlined" onClick={handleCloseModal}>
              Fechar
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Diálogo de confirmação para eliminar subsector */}
      <Dialog
        open={deleteConfirmationOpen}
        onClose={handleCloseDeleteConfirmation}
      >
        <DialogTitle>Confirmar Eliminação</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja eliminar o subsector "{subsectorToDelete}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirmation}>Cancelar</Button>
          <Button onClick={handleDeleteSubsector} color="error">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Sectores;