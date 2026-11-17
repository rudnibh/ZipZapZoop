package p2p.service;

import p2p.utils.UploadUtils;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class FileSharer {

    public static final String STATUS_STAGED = "staged";
    public static final String STATUS_SENDING = "sending";
    public static final String STATUS_SENT = "sent";
    public static final String STATUS_ERROR = "error";

    private final Map<Integer, String> availableFiles;
    private final Map<Integer, String> transferStatuses;

    public FileSharer() {
        availableFiles = new ConcurrentHashMap<>();
        transferStatuses = new ConcurrentHashMap<>();
    }

    public int offerFile(String filePath) {
        while (true) {
            int port = UploadUtils.generateCode();
            if (availableFiles.putIfAbsent(port, filePath) == null) {
                transferStatuses.put(port, STATUS_STAGED);
                return port;
            }
        }
    }

    /**
     * Returns the current lifecycle state for a staged transfer, or null when
     * the port is not known to this process.
     */
    public String getStatus(int port) {
        if (!availableFiles.containsKey(port)) {
            return null;
        }
        return transferStatuses.getOrDefault(port, STATUS_STAGED);
    }

    public void startFileServer(int port) {
        String filePath = availableFiles.get(port);
        if (filePath == null) {
            System.err.println("No file associated with port: " + port);
            return;
        }

        try (ServerSocket serverSocket = new ServerSocket(port)) {
            System.out.println(
                "Serving file '" +
                    new File(filePath).getName() +
                    "' on port " +
                    port
            );
            Socket clientSocket = serverSocket.accept();
            transferStatuses.put(port, STATUS_SENDING);
            System.out.println(
                "Client connected: " + clientSocket.getInetAddress()
            );

            new Thread(
                new FileSenderHandler(clientSocket, filePath, port)
            ).start();
        } catch (IOException e) {
            transferStatuses.put(port, STATUS_ERROR);
            System.err.println(
                "Error starting file server on port " +
                    port +
                    ": " +
                    e.getMessage()
            );
        }
    }

    private class FileSenderHandler implements Runnable {

        private final Socket clientSocket;
        private final String filePath;
        private final int port;

        public FileSenderHandler(
            Socket clientSocket,
            String filePath,
            int port
        ) {
            this.clientSocket = clientSocket;
            this.filePath = filePath;
            this.port = port;
        }

        @Override
        public void run() {
            try (
                FileInputStream fis = new FileInputStream(filePath);
                OutputStream oss = clientSocket.getOutputStream()
            ) {
                // Send the filename as a header
                String filename = new File(filePath).getName();
                String header = "Filename: " + filename + "\n";
                oss.write(header.getBytes());

                // Send the file content
                byte[] buffer = new byte[4096];
                int bytesRead;
                while ((bytesRead = fis.read(buffer)) != -1) {
                    oss.write(buffer, 0, bytesRead);
                }
                oss.flush();

                transferStatuses.put(port, STATUS_SENT);
                System.out.println(
                    "File '" +
                        filename +
                        "' sent to " +
                        clientSocket.getInetAddress()
                );
            } catch (IOException e) {
                transferStatuses.put(port, STATUS_ERROR);
                System.err.println(
                    "Error sending file to client: " + e.getMessage()
                );
            } finally {
                try {
                    clientSocket.close();
                } catch (IOException e) {
                    System.err.println(
                        "Error closing client socket: " + e.getMessage()
                    );
                }
            }
        }
    }
}
